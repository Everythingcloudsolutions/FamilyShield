# FamilyShield — Infrastructure Deployment Troubleshooting Log

> Last updated: 2026-04-16
> Audience: Developers and new team members setting up or maintaining the FamilyShield deployment pipeline
> Platform: FamilyShield v1 — OCI ca-toronto-1, GitHub Actions, Cloudflare Tunnel

---

## Purpose of This Document

This document is a **chronological log of every real infrastructure problem** encountered while building the FamilyShield deployment pipeline from scratch, along with the exact root cause, investigation steps, and fix for each. It is meant to be read by anyone who is:

- Setting up the pipeline for the first time
- Debugging a deployment that is not completing successfully
- Trying to understand *why* the code is written the way it is

If you hit a blank wall and something is not working, read each issue in order. The problems often compound — fixing Issue 3 can expose Issue 5.

---

## Deployment Pipeline Overview

Before reading the individual issues, understand the pipeline structure. Each environment (dev / staging / prod) runs the same sequence of jobs:

```
Job 1: deploy-infra-{env}
  → tofu init + tofu apply
  → Provisions: OCI VM, VCN, security list (SSH: 0.0.0.0/0), NSG, storage bucket
  → Output: vm_ip (public IP of the VM), nsg_vm_id (VM's Network Security Group)
  → SSH is WIDE OPEN during deployment

Job 2: build-and-push (dev) or promote-images (staging/prod)
  → Builds Docker images for api and portal
  → Pushes to GHCR (ghcr.io/everythingcloudsolutions/familyshield-*)

Job 3: deploy-app-{env}
  → SSHes to VM via public IP (SSH: 0.0.0.0/0, always works)
  → Runs: docker compose pull api portal
  → Runs: docker compose up -d api portal

Job 4: setup-cloudflare-{env}
  → Calls cloudflare-api.sh to create tunnel, DNS record, Access app
  → [Bootstrap step] Checks if docker-compose.yml exists on VM; renders+copies if missing
  → Writes docker-compose.override.yaml with real TUNNEL_TOKEN
  → Restarts cloudflared (via docker run --network host)
  → Waits up to 3 minutes for portal URL to return HTTP 200/302/403

Job 5: smoke-test or integration-tests
  → Checks portal: curl with expected HTTP 200/302/403
  → Checks API health: curl /api/health expects HTTP 200/403
  → Fails on any 5xx response

Job 6: tighten-ssh-{env}  (NEW as of 2026-04-16)
  → Runs ONLY after smoke-test passes
  → Queries NSG for all 0.0.0.0/0 SSH rules (used during deploy)
  → Removes them
  → Adds single restricted rule: 173.33.214.49/32 (admin IP only)
  → Phase A security applied at END (after system verified healthy)
```

**Key change (2026-04-16):** SSH is now deployed WIDE-OPEN (0.0.0.0/0) for all jobs, then tightened to admin IP only at the END via tighten-ssh job. This replaces the failed dynamic punch/seal approach (Issue 9).

**Key files involved:**

| File | Purpose |
|------|---------|
| `.github/workflows/deploy-dev.yml` | Dev deployment workflow |
| `.github/workflows/deploy-staging.yml` | Staging deployment workflow |
| `.github/workflows/deploy-prod.yml` | Prod deployment workflow |
| `iac/templates/cloud-init.yaml.tpl` | Cloud-init bootstrap run on VM first boot |
| `iac/templates/docker-compose.yaml.tpl` | Terraform template rendered into docker-compose.yml |
| `scripts/cloudflare-api.sh` | Cloudflare API operations (create tunnel, DNS, Access app) |

---

## Issue 1: SSH Key Missing Trailing Newline — `libcrypto` error

**Date discovered:** 2026-04-14
**Affected jobs:** All jobs that SSH to the VM
**Commit that fixed it:** `3dee412`

### What You See

```
load pubkey "/home/runner/.ssh/familyshield": invalid format
Warning: Identity file /home/runner/.ssh/familyshield not accessible: No such file or directory
ssh: connect to host <ip> port 22: Permission denied (publickey)
```

or:

```
Error loading key "/home/runner/.ssh/familyshield": error in libcrypto
```

### Root Cause

The GitHub Actions workflow was writing the SSH private key from a GitHub Secret using `printf`:

```bash
printf "$SSH_KEY" > ~/.ssh/familyshield   # ❌ broken
```

PEM private key files must end with a newline character after the `-----END RSA PRIVATE KEY-----` or `-----END OPENSSH PRIVATE KEY-----` line. `printf` does not add a trailing newline. Without it, `libcrypto` rejects the key as malformed.

Additionally, `printf` may interpret escape sequences in the key (e.g., `\n` in the middle of the key body) which can corrupt the key bytes.

### How to Confirm

```bash
# On a GitHub Actions runner, check the key file for trailing newline
wc -c ~/.ssh/familyshield      # shows byte count
xxd ~/.ssh/familyshield | tail -3  # should end with 0a (newline)
```

### Fix Applied

Changed all SSH key writes across all three deploy workflows to use `echo` piped through `tr -d '\r'`:

```bash
echo "$SSH_KEY" | tr -d '\r' > ~/.ssh/familyshield   # ✅ correct
chmod 600 ~/.ssh/familyshield
```

- `echo` automatically appends a newline
- `tr -d '\r'` strips Windows-style carriage returns (CRLF → LF), which can corrupt PEM keys when the secret value was pasted from a Windows environment

### Prevention

Always use `echo "$VAR" | tr -d '\r' > file` for writing PEM keys in CI. Never use `printf` or heredoc approaches for SSH/TLS keys.

---

## Issue 2: Terraform State Lock Conflicts — Concurrent Workflow Runs

**Date discovered:** 2026-04-14
**Affected jobs:** `deploy-infra-{env}` in all three workflows
**Commit that fixed it:** `1584b89`

### What You See

```
Error: Error acquiring the state lock

Error message: ConflictException: The conditional request failed

Terraform acquires a state lock to protect the state from being written
by multiple users at the same time.
```

This appears in the `tofu apply` step. The apply aborts and the job fails.

### Root Cause

With no concurrency control on the GitHub Actions workflows, two scenarios trigger concurrent runs:

1. A developer pushes two commits in quick succession to `development` — both trigger `deploy-dev.yml`
2. A deploy is already running and a new workflow run starts before the previous one finishes

Both runs attempt `tofu apply` simultaneously. OpenTofu writes a lock file to the OCI Object Storage backend at the start of apply. The second run tries to acquire the lock while the first run holds it, and fails.

### How to Confirm

In GitHub Actions → the deploy workflow → look for two runs listed simultaneously with the same branch. The failing run will show the lock error in the `OpenTofu Apply` step.

To check for a stuck lock manually (if a run was killed mid-apply):

```bash
# Check for stale lock file in OCI Object Storage
oci os object list --bucket-name familyshield-tfstate \
  --prefix dev/ \
  --query "data[?ends_with(name, '.lock')]"

# Force-unlock if needed (get the lock ID from the error message)
cd iac
tofu init -backend-config=environments/dev/backend.tfvars
tofu force-unlock <lock-id>
```

### Fix Applied

Added `concurrency:` blocks to all three deploy workflows, placed immediately after the `permissions:` block:

```yaml
# deploy-dev.yml and deploy-staging.yml
concurrency:
  group: deploy-dev   # or deploy-staging
  cancel-in-progress: true   # latest push wins — cancel the older run

# deploy-prod.yml
concurrency:
  group: deploy-prod
  cancel-in-progress: false  # never cancel a prod deploy mid-flight — queue it
```

`cancel-in-progress: true` for dev/staging means: if a new deploy starts while one is running, kill the old one and start fresh with latest code. This is safe because dev/staging are not production.

`cancel-in-progress: false` for prod means: if a deploy is in progress and a new one triggers, wait for the first to finish rather than cancelling it mid-flight (which could leave prod in a partially-deployed state).

### Prevention

Every workflow that runs `tofu apply` must have a `concurrency:` block. Without it, any rapid sequence of pushes causes state lock conflicts.

---

## Issue 3: `cloudflare-api.sh` Output Pollution — Tunnel Token Corrupted

**Date discovered:** 2026-04-15
**Affected jobs:** `setup-cloudflare-{env}`
**Commit that fixed it:** Included in cloudflare-api.sh refactor

### What You See

In the `setup-cloudflare-{env}` job logs:

```
Failed to get tunnel token
```

or in the `$GITHUB_OUTPUT` file:

```
tunnel_token=────────────────────────────────────────
tunnel_token=ℹ️  Creating tunnel: familyshield-dev
```

The tunnel token value in `$GITHUB_OUTPUT` contains separator lines and informational messages instead of the actual token string.

### Root Cause

`scripts/cloudflare-api.sh` had helper functions for console output:

```bash
header()  { echo ""; echo "────────────────────────────────────────"; echo "  $1"; }
info()    { echo "ℹ️  $1"; }
success() { echo "✅ $1"; }
```

These functions wrote to **stdout** (`echo` by default). The tunnel token was retrieved via command substitution:

```bash
tunnel_token=$(create_tunnel "familyshield-dev")
```

Command substitution captures **all stdout** from the function. The `create_tunnel` function called `header()` and `info()` internally, so `tunnel_token` ended up containing:

```
────────────────────────────────────────
  Creating tunnel: familyshield-dev
ℹ️  Checking for existing tunnel...
eyJhIjoiNGM3...actual_token_here
```

When this was written to `$GITHUB_OUTPUT`, the multi-line value was malformed and GitHub Actions could not parse it correctly.

A second related problem: `local var=$(cmd)` in bash masks the exit code of `cmd`:

```bash
local tunnel_id=$(curl_failure_here)  # ❌ set -e does NOT abort here
```

`local` is itself a command that exits 0 even if the RHS fails. This meant network failures during tunnel creation were silently ignored.

### How to Confirm

Run the script locally and capture the output:

```bash
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ACCOUNT_ID="your-account"
output=$(bash scripts/cloudflare-api.sh setup dev "test-secret" "admin@example.com" 2>/dev/null)
echo "$output"
# If you see separator lines or info messages in the output, the bug is present
```

### Fix Applied

Two changes to `scripts/cloudflare-api.sh`:

**1. Redirect all diagnostic output to stderr:**

```bash
header()  { echo "" >&2; echo "────────────────────────────────────────" >&2; echo "  $1" >&2; }
info()    { echo "ℹ️  $1" >&2; }
success() { echo "✅ $1" >&2; }
error()   { echo "❌ $1" >&2; }
```

Command substitutions only capture stdout. With diagnostic output on stderr, `tunnel_token=$(create_tunnel ...)` only captures the actual return value.

**2. Split `local var=$(cmd)` declarations:**

```bash
# Before (masks exit codes):
local tunnel_id=$(curl ... | jq -r '.result.id')

# After (set -e catches failures):
local tunnel_id
tunnel_id=$(curl ... | jq -r '.result.id')
```

### Prevention

In bash scripts using `set -e`:

- Always send diagnostic/informational output to `>&2`
- Never use `local var=$(cmd)` in a single statement — always split into `local var` + `var=$(cmd)`
- Test command substitutions by running with `set -x` to see what's actually captured

---

## Issue 4: Cloudflare Tunnel Stays INACTIVE — Token Never Reached VM

**Date discovered:** 2026-04-15
**Affected jobs:** `setup-cloudflare-{env}` — tunnel created but INACTIVE
**Commit that fixed it:** Included in docker run approach (commit `3f023e2`)

### What You See

In the Cloudflare dashboard:

- The tunnel `familyshield-dev` appears
- Status shows **INACTIVE** or **DEGRADED**
- The portal URL times out or returns a connection error

In the `setup-cloudflare-{env}` job, an earlier version of the workflow wrote the tunnel token to a `docker-compose.override.yaml` and ran:

```bash
docker compose up -d --no-deps cloudflared
```

This failed with:

```
no configuration file provided: not found
```

### Root Cause

The FamilyShield VM receives its `docker-compose.yml` at **first boot** via `cloud-init`. The `cloud-init.yaml.tpl` template contains a `write_files` directive that base64-encodes and writes the rendered docker-compose file to `/opt/familyshield/docker-compose.yml`.

However, when the VM already existed (from a previous IaC apply), **IaC does not recreate it**. The existing VM may have had a failed or incomplete cloud-init run from its initial provisioning. The `docker-compose.yml` was never written on that VM.

When the workflow attempted `docker compose up -d cloudflared`, Docker Compose looked for `docker-compose.yml` in `/opt/familyshield/` and could not find it. The command failed.

**Why the failure was not caught earlier:** See Issue 5 below (appleboy/ssh-action silent failure). The `deploy-app` job was reporting success even though all Docker Compose commands failed.

### How to Confirm

```bash
# SSH to the VM and check
ssh ubuntu@<vm-ip>
ls /opt/familyshield/
# If docker-compose.yml is missing, this is the problem

# Also check cloud-init status
sudo cloud-init status --long
# "status: error" or "status: done" — if "error", cloud-init failed on first boot
```

### Fix Applied

Changed cloudflared to start via `docker run --network host` instead of `docker compose`:

```bash
ssh ubuntu@"$VM_IP" \
  "docker stop familyshield-cloudflared 2>/dev/null || true; \
   docker rm familyshield-cloudflared 2>/dev/null || true; \
   docker run -d \
     --name familyshield-cloudflared \
     --restart unless-stopped \
     --network host \
     cloudflare/cloudflared:latest \
     tunnel --no-autoupdate run --token $TUNNEL_TOKEN"
```

Why this works without `docker-compose.yml`:

- `cloudflare/cloudflared:latest` is a standard public image — no local Dockerfile needed
- The `--token` flag tells cloudflared to download its ingress configuration from Cloudflare's control plane
- `--network host` means cloudflared can reach services on `localhost:3000` (portal) and `localhost:3001` (API) without needing to know Docker network aliases
- `--restart unless-stopped` means the container survives VM reboots

The `docker-compose.yml` dependency for cloudflared is completely eliminated.

### Prevention

For any service that connects outbound to a cloud control plane (Cloudflare, Tailscale, etc.), prefer starting it with `docker run` and a token rather than relying on a locally-rendered config file. Local config files can be missing on newly provisioned or recovered VMs.

---

## Issue 5: `appleboy/ssh-action` Silent Failure — Jobs Show Green on Failure

**Date discovered:** 2026-04-15
**Affected jobs:** `deploy-app-{env}`

### What You See

The `deploy-app-dev` job shows a **green checkmark ✅** in GitHub Actions. But when you SSH to the VM:

```bash
ssh ubuntu@<vm-ip>
docker ps
# Output: no containers running
```

The portal is not accessible. The smoke test fails with 502.

### Root Cause

The `appleboy/ssh-action` GitHub Action uses `drone-ssh` internally. The version in use (v1.8.2) has a known behaviour: **it runs the entire `script:` block and only uses the exit code of the final command to determine success or failure.**

This means a script like:

```yaml
script: |
  docker compose pull api portal   # ❌ fails: no docker-compose.yml
  docker compose up -d api portal  # ❌ fails: no docker-compose.yml
  docker compose ps                # ❌ fails: no docker-compose.yml
  echo "✅ Deploy complete"        # ✅ exit 0 — this is what drone-ssh reports
```

Always succeeds because `echo` always exits 0.

**None of the Docker Compose commands were actually running.** The VM had no `docker-compose.yml`, so every `docker compose` call failed immediately — but the failure was swallowed.

### How to Confirm

```bash
# Run the same commands manually via SSH and check exit codes
ssh ubuntu@<vm-ip> 'docker compose -f /opt/familyshield/docker-compose.yml ps; echo "exit: $?"'
# If it says "no configuration file provided", the issue is confirmed
```

To test whether your ssh-action script is truly failing:

```yaml
# Add set -e as the first line of your script block
script: |
  set -e           # ← this makes drone-ssh abort on first error
  docker compose pull api portal
  ...
```

With `set -e`, the first failing command causes the script to exit non-zero, and `appleboy/ssh-action` will report failure.

### Mitigation Applied

Rather than adding `set -e` to the `appleboy/ssh-action` scripts (which could cause issues with commands that legitimately return non-zero like `docker ps` when no containers are running), the approach was:

1. Fix the underlying cause (ensure docker-compose.yml exists via the bootstrap step — see Issue 8)
2. Add `sudo cloud-init status --wait || true` as the first command in `deploy-app` scripts (see Issue 6)
3. Accept that `appleboy/ssh-action` is best effort for the deploy-app step; the smoke test at the end is the real validation gate

### Prevention

- Treat `appleboy/ssh-action` `script:` blocks as "fire and hope" — the smoke test job is the authoritative pass/fail gate
- For critical operations that must fail the job on error, use a `run:` step with direct SSH invocation on the GitHub Actions runner (not inside an action), so bash's own error handling applies
- Or add `set -e` to `script:` blocks if you need strict error propagation

---

## Issue 6: Cloud-Init Timing — Docker Compose Commands Run Before VM Is Ready

**Date discovered:** 2026-04-15
**Affected jobs:** `deploy-app-{env}` on brand-new VM provisioning
**Commit that fixed it:** `458de80`

### What You See

On a **new VM** (just provisioned by `deploy-infra`), the `deploy-app` job runs immediately after and fails silently (see Issue 5). When you SSH to the VM:

```bash
sudo cloud-init status
# status: running
```

Or even after cloud-init completes, `docker-compose.yml` is missing.

### Root Cause

OCI Ubuntu 22.04 ARM VMs run `cloud-init` on first boot to configure the system. The `cloud-init.yaml.tpl` template includes:

```yaml
write_files:
  - path: /opt/familyshield/docker-compose.yml
    encoding: b64
    content: <base64 of rendered docker-compose>

packages:
  - docker.io
  - docker-compose-plugin
  ...

runcmd:
  - systemctl enable --now docker
  - docker compose -f /opt/familyshield/docker-compose.yml up -d
  ...
```

**Cloud-init execution order on Ubuntu:** `write_files` runs before `packages` and `runcmd`. However:

- `packages` (apt install + upgrade) can take **5–15 minutes** on a fresh VM
- `runcmd` runs after `packages`
- The GitHub Actions `deploy-infra` job completes as soon as `tofu apply` returns (which happens as soon as OCI reports the VM is `RUNNING`, not after cloud-init finishes)
- The `deploy-app` job starts immediately after `deploy-infra`
- On a new VM, `deploy-app` may SSH in while cloud-init is still installing packages

Additionally, even after cloud-init finishes, if it failed (e.g., a package install failed, or the base64 content was malformed), the `docker-compose.yml` may never be written.

### How to Confirm

```bash
# After SSH into a new VM
sudo cloud-init status --long
# Look for: "status: running" (still in progress) or "status: error" (failed)

# Check what cloud-init has done so far
sudo cat /var/log/cloud-init-output.log | tail -50

# Check what is already on disk
ls -la /opt/familyshield/
```

### Fix Applied

Added `sudo cloud-init status --wait 2>/dev/null || true` as the **first command** in the `deploy-app-{env}` SSH script:

```yaml
script: |
  # Wait for cloud-init to complete (may take 5–15 min on first boot)
  sudo cloud-init status --wait 2>/dev/null || true
  cd /opt/familyshield
  docker compose pull api portal
  docker compose up -d --no-deps --remove-orphans api portal
  sleep 10
  docker compose ps
  echo "✅ deploy complete"
```

- `--wait` blocks until cloud-init reaches `status: done` or `status: error`
- `|| true` prevents the step from failing if cloud-init itself errored (we handle that in the bootstrap step — see Issue 8)
- `2>/dev/null` suppresses the verbose cloud-init status output which would otherwise fill the job log

**Important:** This guard is only effective on new VMs. On existing VMs, cloud-init exits instantly because it only runs once per boot.

### Prevention

Always put `sudo cloud-init status --wait || true` at the start of any SSH script that runs on a freshly provisioned VM. Without it, you are racing cloud-init.

---

## Issue 7: `deploy-staging.yml` Gate Job — Broken `if:` Condition

**Date discovered:** 2026-04-15
**Affected jobs:** The gate job at the start of `deploy-staging.yml`
**Commit that fixed it:** Included in workflow restructure

### What You See

The staging workflow never runs, even after dev deployment succeeds. Clicking "Actions" in GitHub shows no `deploy-staging` run at all, or it shows the gate job failing immediately.

### Root Cause

The staging workflow had a `gate` job designed to wait for the dev workflow to succeed before running:

```yaml
on:
  push:
    branches: [qa]

jobs:
  gate:
    if: github.event.workflow_run.conclusion == 'success'  # ❌ wrong trigger
    ...
```

The `github.event.workflow_run` context is only populated when a workflow is triggered by the `workflow_run` event. But `deploy-staging.yml` was triggered by `push` to the `qa` branch. On a `push` event, `github.event.workflow_run` is `null`, and `.conclusion` evaluates to an empty string — **not** `'success'`. The condition was always false, so the gate job never passed, and no subsequent jobs ran.

### How to Confirm

In GitHub Actions → `deploy-staging` → click the failed run → look at the gate job:

```
gate: skipped
Reason: Wasn't required because of the if condition
```

Or in the GitHub Actions JSON:

```json
"conclusion": "skipped",
"steps": [],
"message": "The if condition evaluated to false"
```

### Fix Applied

Removed the gate job entirely. The `deploy-staging.yml` workflow now triggers on `push` to the `qa` branch and immediately runs `deploy-infra-staging` — same pattern as dev on `development`. The "waiting for dev to pass" gate is replaced by the human process:

1. Dev passes → human creates `qa` branch from `development` → staging auto-deploys

This is simpler and more reliable than trying to chain workflows programmatically.

If you need to chain workflows (`workflow_run`), the correct setup is:

```yaml
on:
  workflow_run:
    workflows: ["Deploy — Dev"]
    types: [completed]
    branches: [development]

jobs:
  gate:
    if: github.event.workflow_run.conclusion == 'success'  # ✅ now populated
```

### Prevention

Do not mix `push` triggers with `github.event.workflow_run` conditions. They come from different contexts. If you want to trigger on another workflow completing, use the `workflow_run` event. If you want to trigger on a branch push, use `push`.

---

## Issue 8: `docker-compose.yml` Missing on Existing VM — Smoke Test Returns 502

**Date discovered:** 2026-04-15
**Affected jobs:** `setup-cloudflare-{env}` and `smoke-test`
**Commit that fixed it:** `6330a18`

### What You See

The `setup-cloudflare-dev` job completes. Cloudflared starts. The tunnel shows as **ACTIVE** in Cloudflare. But the smoke test fails:

```
Testing portal: https://familyshield-dev.everythingcloud.ca
HTTP 502 Bad Gateway
❌ Expected 200/302/403 — got 502. Aborting.
```

When you SSH to the VM:

```bash
docker ps
# Output: only familyshield-cloudflared is running; api and portal are NOT
ls /opt/familyshield/
# docker-compose.yml is missing
```

### Root Cause

This is the compounded effect of three previous issues (Issues 4, 5, 6):

1. The VM was provisioned before the cloud-init wait fix (Issue 6) was in place
2. Cloud-init failed or didn't complete on first boot, so `docker-compose.yml` was never written
3. The `deploy-app` job ran, all Docker Compose commands failed silently (Issue 5), and the job reported success
4. Now `api` and `portal` containers are not running
5. Cloudflared is running (via `docker run` — Issue 4 fix) and connects to Cloudflare successfully
6. But when a browser request arrives via the tunnel, cloudflared routes it to `localhost:3001` (API) and `localhost:3000` (portal) — neither is running
7. cloudflared returns **HTTP 502 Bad Gateway**
8. The smoke test checks for 200/302/403 and receives 502 → exits 1

**Why IaC doesn't fix this:**

`tofu apply` is idempotent — if the VM already exists, OCI recognises that no VM resource changes are needed and skips VM recreation. Cloud-init only runs on first boot. The broken VM state from a failed initial provisioning persists indefinitely.

### How to Confirm

```bash
# Check if docker-compose.yml exists
ssh ubuntu@<vm-ip> "ls /opt/familyshield/"

# Check which containers are running
ssh ubuntu@<vm-ip> "docker ps --format 'table {{.Names}}\t{{.Status}}'"

# Check what the cloudflared container is doing
ssh ubuntu@<vm-ip> "docker logs familyshield-cloudflared --tail 20"
# Should say: "Registered tunnel connection connIndex=0"

# Manually test the API health from the VM
ssh ubuntu@<vm-ip> "curl -s http://localhost:3001/health"
# Returns empty or connection refused = api is not running
```

### Fix Applied

Added a **"Bootstrap VM — copy docker-compose.yml if missing"** step to the `setup-cloudflare-{env}` job in all three workflow files, positioned between `Setup Cloudflare` and `Write tunnel token to VM and activate cloudflared`:

```bash
# On the GitHub Actions runner:

# 1. SSH to VM and check if docker-compose.yml exists
COMPOSE_EXISTS=$(ssh -i ~/.ssh/familyshield \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  ubuntu@"$VM_IP" \
  "test -f /opt/familyshield/docker-compose.yml && echo yes || echo no" 2>/dev/null || echo "no")

if [ "$COMPOSE_EXISTS" = "yes" ]; then
  echo "✅ docker-compose.yml exists — skipping bootstrap"
  exit 0
fi

# 2. Render the Terraform template on the runner using sed
#    ${environment}, ${tunnel_token}, etc. are Terraform vars → substitute with real values
#    $${VAR} → ${VAR} (un-escape for Docker runtime env vars)
sed \
  -e "s|\${environment}|dev|g" \
  -e "s|\${tunnel_token}|TUNNEL_TOKEN_PLACEHOLDER_dev|g" \
  -e "s|\${supabase_url}|$SUPABASE_URL|g" \
  -e "s|\${supabase_anon_key}|$SUPABASE_ANON_KEY|g" \
  -e "s|\${groq_api_key}|$GROQ_API_KEY|g" \
  -e "s|\${anthropic_api_key}|$ANTHROPIC_API_KEY|g" \
  -e 's|\$\${|\${|g' \
  iac/templates/docker-compose.yaml.tpl > /tmp/docker-compose.yml

# 3. SCP the rendered file to the VM
scp -i ~/.ssh/familyshield \
  -o StrictHostKeyChecking=no \
  /tmp/docker-compose.yml \
  ubuntu@"$VM_IP":/opt/familyshield/docker-compose.yml

# 4. Start api and portal via docker compose
ssh ubuntu@"$VM_IP" \
  "cd /opt/familyshield && \
   docker compose pull api portal 2>&1 | tail -5 && \
   docker compose up -d --remove-orphans api portal && \
   sleep 10 && \
   docker compose ps"
```

**Why `TUNNEL_TOKEN_PLACEHOLDER_dev` is used for `${tunnel_token}`:**

At the time this step runs, the real tunnel token has already been retrieved in the cloudflare-api.sh setup step and is available in `$TUNNEL_TOKEN`. However, the cloudflared service in `docker-compose.yml` is **not used** — cloudflared is started separately via `docker run --token` in the next step. The placeholder value in `docker-compose.yml` does not affect anything.

**Why the step is idempotent:**

The first thing the step does is SSH and check for the file. If `docker-compose.yml` already exists (healthy VMs, or the step is re-run), the step logs "skipping bootstrap" and exits 0 immediately. There is no risk of overwriting a working compose file.

### Prevention

The bootstrap step is now a permanent part of the deployment pipeline for all three environments. It acts as a self-healing mechanism: if `docker-compose.yml` is ever missing (failed cloud-init, manual deletion, disk corruption, VM replacement), the next deployment run will automatically restore it.

---

## Summary Table: All Issues and Fixes

| # | Problem | Symptom | Root Cause | Fix | Commit |
|---|---------|---------|------------|-----|--------|
| 1 | SSH key missing newline | `libcrypto error` | `printf` no trailing newline | `echo "$KEY" | tr -d '\r'` | `3dee412` |
| 2 | Terraform state lock conflict | `Error acquiring state lock` | No concurrency control on workflows | `concurrency:` blocks with `cancel-in-progress` | `1584b89` |
| 3 | cloudflare-api.sh output pollution | Tunnel token corrupted | `header()`/`info()` wrote to stdout | Redirect all diagnostics to `>&2`; split `local var=$(cmd)` | In cloudflare-api.sh |
| 4 | Tunnel stays INACTIVE | Cloudflare shows INACTIVE | `docker compose up cloudflared` fails — compose file missing | Use `docker run --network host --token` (no compose dependency) | `3f023e2` |
| 5 | appleboy/ssh-action silent failure | Job shows green, containers not running | drone-ssh only checks last command's exit code | Smoke test is the real gate; bootstrap step handles the root cause | N/A (documentation) |
| 6 | Cloud-init timing on new VMs | Compose commands fail on first deploy | deploy-app runs before cloud-init finishes | `sudo cloud-init status --wait || true` at start of deploy-app | `458de80` |
| 7 | deploy-staging gate job never passes | Staging never deploys | `workflow_run` context missing on `push` trigger | Removed gate job; staging triggers on `qa` branch push | Workflow restructure |
| 8 | 502 on smoke test — api/portal not running | Smoke test fails immediately | docker-compose.yml missing on VM; silent failure from Issue 5 | Bootstrap VM step: check + render + SCP + start if missing | `6330a18` |

---

## Current State of the Pipeline (2026-04-15)

After all the above fixes:

- ✅ SSH key is written correctly with trailing newline
- ✅ Concurrent runs are prevented by concurrency groups
- ✅ cloudflare-api.sh outputs clean values to stdout, diagnostics to stderr
- ✅ cloudflared starts via `docker run --network host` — zero dependency on docker-compose.yml
- ✅ cloud-init wait prevents race conditions on new VMs
- ✅ deploy-staging triggers correctly on `qa` branch push
- ✅ Bootstrap VM step restores docker-compose.yml if missing on any environment

**Remaining known issue:** The pipeline has not yet completed a full end-to-end successful run (IaC → Docker build → app deploy → Cloudflare setup → smoke test all green). The fixes above address the specific blockers identified up to 2026-04-15.

---

## Diagnostic Commands Reference

### Check the full pipeline state from scratch

```bash
# 1. Which VM IP does IaC output?
cd iac
tofu output  # shows vm_ip for each environment

# 2. Is the VM accessible?
ssh-keyscan <vm-ip>  # returns host key if reachable

# 3. What's running on the VM?
ssh ubuntu@<vm-ip> "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'"

# 4. Does docker-compose.yml exist?
ssh ubuntu@<vm-ip> "ls -la /opt/familyshield/"

# 5. Is cloudflared connected?
ssh ubuntu@<vm-ip> "docker logs familyshield-cloudflared --tail 5"
# Look for: "Registered tunnel connection connIndex=0"

# 6. Are api and portal responding?
ssh ubuntu@<vm-ip> "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/health"
ssh ubuntu@<vm-ip> "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000"

# 7. Is the public URL reachable?
curl -s -o /dev/null -w '%{http_code}' https://familyshield-dev.everythingcloud.ca/api/health
```

### Read cloud-init logs after a failed deploy

```bash
ssh ubuntu@<vm-ip>

# Status summary
sudo cloud-init status --long

# Full output log (most useful)
sudo cat /var/log/cloud-init-output.log

# Cloud-init config as received
sudo cat /var/lib/cloud/instance/user-data.txt

# What write_files actually wrote
sudo ls -la /opt/familyshield/
```

### Check and manually restore docker-compose.yml

```bash
# On the GitHub Actions runner (or your local machine with the repo cloned):
# Substitute your actual values for the secret placeholders below

sed \
  -e "s|\${environment}|dev|g" \
  -e "s|\${tunnel_token}|TUNNEL_TOKEN_PLACEHOLDER_dev|g" \
  -e "s|\${supabase_url}|https://xxx.supabase.co|g" \
  -e "s|\${supabase_anon_key}|eyJxxx|g" \
  -e "s|\${groq_api_key}|gsk_xxx|g" \
  -e "s|\${anthropic_api_key}|sk-ant-xxx|g" \
  -e 's|\$\${|\${|g' \
  iac/templates/docker-compose.yaml.tpl > /tmp/docker-compose.yml

# Copy to VM
scp -i ~/.ssh/familyshield /tmp/docker-compose.yml ubuntu@<vm-ip>:/opt/familyshield/docker-compose.yml

# Start all services
ssh ubuntu@<vm-ip> "cd /opt/familyshield && docker compose up -d"
```

### Check tunnel token on the VM

```bash
ssh ubuntu@<vm-ip>

# Check cloudflared started via docker run (current architecture)
docker inspect familyshield-cloudflared | jq '.[0].Args'
# Should include: "--token" followed by the real token value

# If cloudflared was started via docker compose instead (old architecture)
# Check that the token is NOT the placeholder
docker exec familyshield-cloudflared env | grep TUNNEL_TOKEN
# TUNNEL_TOKEN_PLACEHOLDER_dev = placeholder still there (problem)
# eyJhIjoiN... = real token (correct)
```

---

## Issue 9: SSH Dynamic Punch/Seal Approach Failed — OCI CLI Exit Code 2 (REPLACED 2026-04-16)

**Date discovered:** 2026-04-16
**Affected jobs:** deploy-app-{env}
**Status:** RESOLVED — Replaced with deploy-first, secure-last approach
**Commit that replaced it:** `64e46b7`

### What Happened (Old Approach)

The deploy-app job tried to dynamically punch a temporary SSH hole:

1. Get GitHub Actions runner IP via `curl https://api.ipify.org`
2. Add a temporary NSG rule: `oci network nsg-rules add --nsg-id $NSG_ID --security-rules [{...}]`
3. SSH to VM and deploy containers
4. Remove the temporary rule: `oci network nsg-rules remove --nsg-id $NSG_ID --security-rule-ids [...]`

The `oci network nsg-rules add` command would fail with **exit code 2**, halting the deploy.

### Why It Failed

The OCI CLI `nsg-rules add` command was rejecting the request. Possible causes:

- Malformed JSON in the `--security-rules` parameter
- Concurrent state conflicts (multiple runs trying to add rules simultaneously)
- API rate limiting or temporary unavailability

The added complexity of dynamic rule management during deployment created failure points that were hard to diagnose.

### The Solution: Deploy-First, Secure-Last (2026-04-16)

- **Deploy phase:** SSH deployed WIDE OPEN: `admin_ssh_cidrs = ["0.0.0.0/0"]` in all tfvars files
- **During deploy:** All jobs (infra, build, deploy-app, setup-cloudflare, smoke-test) use public IP SSH — always works, no dynamic rules needed
- **After deploy:** New `tighten-ssh-{env}` job runs at END (only if smoke-test passes):
  1. Query NSG for all 0.0.0.0/0 SSH rules
  2. Remove them
  3. Add single restricted rule: `173.33.214.49/32` (admin IP only)

**Benefits:**

- ✅ No OCI CLI errors during deployment (no dynamic rules added during deploy)
- ✅ SSH always available when needed (0.0.0.0/0 during deploy)
- ✅ Security applied AFTER system verified healthy (via smoke-test)
- ✅ Simpler, more reliable pipeline architecture
- ✅ No chicken-and-egg lockout risk

**Files changed:**

- `iac/variables.tf`: default `admin_ssh_cidrs = ["0.0.0.0/0"]`
- `iac/environments/{dev,staging,prod}/terraform.tfvars`: `admin_ssh_cidrs = ["0.0.0.0/0"]`
- All three `.github/workflows/deploy-*.yml`: Removed punch/seal steps, added `tighten-ssh-*` job

**Lesson:** Dynamic complexity during deployment is risky. Apply security measures AFTER you've confirmed the system works.

---

## Workflow File Quick Reference

| Workflow file | Trigger | Job sequence |
|--------------|---------|-------------|
| `deploy-dev.yml` | Push to `development` | infra → build → deploy-app → cloudflare → smoke-test |
| `deploy-staging.yml` | Push to `qa` | infra → promote-images → deploy-app → cloudflare → integration-tests |
| `deploy-prod.yml` | Push to `main` | infra → promote-images → deploy-app → cloudflare → smoke-test |
| `pr-check.yml` | PR to `development` or `main` | lint → tofu validate → tofu plan (posted as PR comment) |
| `cleanup-cloudflare.yml` | Manual (`workflow_dispatch`) | cloudflare-api.sh cleanup — removes tunnel, DNS, Access app |

**Concurrency groups (prevent state lock conflicts):**

| Workflow | Group | cancel-in-progress |
|---------|-------|-------------------|
| `deploy-dev.yml` | `deploy-dev` | `true` — latest push wins |
| `deploy-staging.yml` | `deploy-staging` | `true` — latest push wins |
| `deploy-prod.yml` | `deploy-prod` | `false` — queue, never cancel mid-flight |

---

*FamilyShield — Intelligent Parental Control Platform*
*Operated by Mohit (Everythingcloudsolutions) — Toronto, Canada*
*This document is a living record — update it when new infrastructure issues are discovered and resolved.*
