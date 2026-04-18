# FamilyShield — Developer Guide

> Everything you need to go from zero to a running dev environment.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Repository Setup](#2-repository-setup)
3. [OCI Account Bootstrap](#3-oci-account-bootstrap)
4. [GitHub Secrets Configuration](#4-github-secrets-configuration)
5. [VS Code Remote SSH Setup](#5-vs-code-remote-ssh-setup)
6. [First Deploy (dev environment)](#6-first-deploy)
7. [First Device Enrolment](#7-first-device-enrolment)
8. [Daily Development Workflow](#8-daily-development-workflow)
9. [Workflow Decision Matrix and Scenarios](#9-workflow-decision-matrix-and-scenarios)
10. [Architecture Overview](#10-architecture-overview)
11. [Working with Each Service](#11-working-with-each-service)
12. [Testing](#12-testing)
13. [Contributing](#13-contributing)
14. [Security Hardening Updates (2026-04-16)](#14-security-hardening-updates-2026-04-16)

---

## 1. Prerequisites

### On your Windows laptop

| Tool | Purpose | Install |
|---|---|---|
| VS Code | Editor + Remote SSH | <https://code.visualstudio.com> |
| Git | Version control | <https://git-scm.com> |
| GitHub CLI | Repo management | `winget install GitHub.cli` |
| OCI CLI | Cloud operations | `pip install oci-cli` |
| OpenTofu | IaC | <https://opentofu.org/docs/intro/install> |
| OpenSSH | SSH key management | Built into Windows 10+ |

### OCI Account

- Sign up at [oracle.com/cloud/free](https://oracle.com/cloud/free)
- Select region: **Canada Southeast (ca-toronto-1)** — Toronto
- Credit card required but **not charged** on Always Free resources

### GitHub Access

- Repository: `github.com/Everythingcloudsolutions/FamilyShield` (private)
- You need: Owner or Admin role

---

## 2. Repository Setup

```bash
# Clone the repository
git clone https://github.com/Everythingcloudsolutions/FamilyShield.git
cd FamilyShield

# Configure GitHub repository settings (environments, branch protection, labels)
bash scripts/setup-github.sh
```

---

## 3. OCI Account Bootstrap (11 Steps)

Run **once** from your Windows laptop after OCI account is created:

```bash
# Make executable
chmod +x scripts/bootstrap-oci.sh

# Run bootstrap — follow the prompts
bash scripts/bootstrap-oci.sh
```

This script performs 11 steps:

1. Verify OCI CLI is configured
2. Optional: Enable Cloud Guard security monitoring
3. Create a dedicated GitHub Actions IAM user (`familyshield-github-actions`)
4. Generate an API key pair (private key → GitHub Secret `OCI_PRIVATE_KEY`)
5. Create the dynamic group for GitHub Actions OIDC identities
6. Grant bootstrap IAM policy (grants tenancy-level permissions to the user)
7. **Create three environment compartments** (`familyshield-dev`, `familyshield-staging`, `familyshield-prod`) — **REQUIRED by IaC**
8. Bootstrap the Terraform state Object Storage bucket (`familyshield-tfstate` with environment prefixes)
9. Find the correct Ubuntu 22.04 ARM image OCID for ca-toronto-1 (informational only — IaC queries this automatically)
10. Generate an SSH key pair for VM access
11. Print all the GitHub Secret values you need to add

**Critical:** The compartments created in Step 7 are required by the IaC deployment. The Terraform/OpenTofu code queries for these compartments and will fail with a clear error if they don't exist.

---

## 4. GitHub Secrets Configuration

Go to: `https://github.com/Everythingcloudsolutions/FamilyShield/settings/secrets/actions`

Add these repository secrets (values from bootstrap-oci.sh output):

### OCI Secrets

| Secret Name | Where to get it |
|---|---|
| `OCI_TENANCY_OCID` | OCI Console → Profile → Tenancy |
| `OCI_USER_OCID` | bootstrap-oci.sh output |
| `OCI_FINGERPRINT` | bootstrap-oci.sh output |
| `OCI_PRIVATE_KEY` | `~/.oci/familyshield-github/private.pem` |
| `OCI_NAMESPACE` | bootstrap-oci.sh output |
| `OCI_SSH_PUBLIC_KEY` | `~/.ssh/familyshield.pub` |
| `OCI_SSH_PRIVATE_KEY` | `~/.ssh/familyshield` |

### Cloudflare Secrets

| Secret Name | Where to get it | Used For |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → Profile → API Tokens → **Custom Token** with **5 scopes** (see below) | IaC — tunnel, DNS, access apps, service token, WAF config |
| `CLOUDFLARE_ZONE_ID` | Cloudflare → everythingcloud.ca → Overview → Zone ID | DNS zone management |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare → Profile → Account ID | Tunnel + Access creation |
| `GH_PAT` | GitHub → Settings → Developer settings → Fine-grained PATs (Account: Everythingcloudsolutions, Repo: FamilyShield, Permission: Secrets → Read and Write) | `infra-dev.yml` writes fresh service token to GitHub Secrets after each infra deploy |

**Cloudflare API Token — 5 Required Scopes:**

Create a **Custom Token** (not a template) with all five:

```
Zone → DNS → Edit                           (CNAME record management)
Account → Cloudflare Tunnel → Edit          (tunnel creation)
Account → Access: Apps and Policies → Edit  (access application creation)
Account → Access: Service Tokens → Edit     (service token creation)
Zone → Config Rules → Edit                  (WAF config ruleset)
```

The "Edit zone DNS" template only grants the first scope — insufficient.

**Tunnel SSH Access Tokens (auto-managed):**

The infra workflow creates a Cloudflare Access Service Token via OpenTofu and automatically writes it to GitHub Secrets after each successful infra deploy. You do not create these manually.

| Secret Name | Source |
|---|---|
| `CF_ACCESS_CLIENT_ID` | Auto-updated by `infra-dev.yml` / `infra-prod.yml` after each Cloudflare IaC apply |
| `CF_ACCESS_CLIENT_SECRET` | Auto-updated by `infra-dev.yml` / `infra-prod.yml` after each Cloudflare IaC apply |

These are used by `deploy-dev.yml` and `deploy-prod.yml` for Cloudflare tunnel SSH. They must exist before the first app deployment runs. Run `infra-dev.yml` at least once to populate them.

**Bot Fight Mode — Manual Step (one-time):**

Cloudflare's Bot Fight Mode fires before Access policy evaluation and blocks GitHub Actions datacenter IPs with `cf-mitigated: challenge`. It cannot be disabled via API on the free tier.

Disable it once in the Cloudflare dashboard: **Security → Bots → Bot Fight Mode → OFF**

Without this step, `verify-tunnel` in `deploy-dev.yml` will time out with `cf-mitigated: challenge` even when credentials are correct.

### Application Secrets

| Secret Name | Where to get it |
|---|---|
| `ADGUARD_ADMIN_PASSWORD` | Choose a strong password |
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` `secret` key |
| `GROQ_API_KEY` | console.groq.com → API Keys |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |

---

## 5. Remote SSH Access (Tunnel + Local)

### Option A: SSH via Cloudflare Tunnel (Recommended — Always Available)

Install `cloudflared` on your Windows laptop:

```bash
# Download from GitHub releases
# https://github.com/cloudflare/cloudflared/releases

# Or via scoop (Windows package manager)
scoop install cloudflared
```

Add to `C:\Users\<YourName>\.ssh\config`:

```
Host familyshield-dev
    HostName           ssh-dev.everythingcloud.ca
    User               ubuntu
    IdentityFile       ~/.ssh/familyshield
    ProxyCommand       cloudflared access ssh --hostname ssh-dev.everythingcloud.ca
    ServerAliveInterval 60
    ServerAliveCountMax 3

Host familyshield-prod
    HostName           ssh-prod.everythingcloud.ca
    User               ubuntu
    IdentityFile       ~/.ssh/familyshield
    ProxyCommand       cloudflared access ssh --hostname ssh-prod.everythingcloud.ca
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Then SSH via tunnel:

```bash
ssh familyshield-dev
ssh familyshield-prod
```

**Benefits:**

- ✅ Works from anywhere (home, office, café)
- ✅ No VPN needed
- ✅ Cloudflare Zero Trust enforces email authentication
- ✅ All traffic encrypted end-to-end
- ✅ No public IP exposure

### Option B: VS Code Remote SSH (Tunnel-Based)

1. Install extension: `Remote - SSH` (ms-vscode-remote.remote-ssh)
2. `Ctrl+Shift+P` → `Remote-SSH: Connect to Host`
3. Select `familyshield-dev`
4. Open folder: `/opt/familyshield`
5. VS Code will install dev container extensions automatically

> **Note:** VS Code will use the SSH config above (Option A) automatically. Make sure `cloudflared` is installed first.

### Option C: Direct Public IP SSH (Emergency Only — During Deploy)

During the initial `infra-{env}.yml` deployment, SSH is temporarily open to `0.0.0.0/0`. You can SSH directly to the public IP:

```bash
# Get VM public IP from GitHub Actions output or:
tofu output -raw vm_public_ip

# SSH via public IP (only works while infra workflow is running)
ssh -i ~/.ssh/familyshield ubuntu@<VM_IP>
```

**When available:** Only during `infra-*` workflow (tofu apply → setup-cloudflare → smoke-infra stages)  
**When NOT available:** After `tighten-ssh` job completes (NSG restricted to admin IP 173.33.214.49/32)  
**Use:** Emergency access only if tunnel is down. Normally use **Option A** (tunnel SSH).

---

## 6. First Deploy

```bash
# 1. Commit and push to a feature branch
# Note: No manual updates needed for image OCID — IaC queries it automatically
git checkout -b feat/phase-1-bootstrap
git add .
git commit -m "feat: initial IaC scaffold for Phase 1"
git push origin feat/phase-1-bootstrap

# 2. Open a Pull Request → GitHub Actions runs:
#    - Lint & Validate
#    - tofu plan (posted as PR comment — review it!)
#    - Security scan

# 3. Merge PR → GitHub Actions auto-deploys to dev

# 4. Check deploy at:
#    https://familyshield-dev.everythingcloud.ca
```

---

## 7. First Device Enrolment

After the dev environment is fully deployed and all services are healthy, enrol a test device to verify the end-to-end monitoring stack: Tailscale → mitmproxy → Redis → API → Supabase → portal.

### Prerequisites

- `infra-dev.yml` and `deploy-dev.yml` have both run to completion with no failures
- Portal is reachable at `https://familyshield-dev.everythingcloud.ca`
- All 10 Docker services show `Up` when you run `sudo docker compose ps` on the VM
- You have SSH access to the VM

---

### Step 1 — Verify all services are healthy

SSH to the dev VM and confirm everything is running:

```bash
ssh -i ~/.ssh/familyshield ubuntu@ssh-dev.everythingcloud.ca
sudo docker compose ps
```

Expected output — all services should show `Up` or `Up (healthy)`:

```
familyshield-adguard      Up (healthy)
familyshield-headscale    Up (healthy)
familyshield-mitmproxy    Up (healthy)
familyshield-redis        Up (healthy)
familyshield-api          Up (healthy)
familyshield-portal       Up (healthy)
familyshield-nodered      Up
familyshield-influxdb     Up (healthy)
familyshield-grafana      Up (healthy)
familyshield-ntfy         Up
```

If any service shows `Exit` or `Restarting`, check its logs before proceeding:

```bash
sudo docker logs familyshield-<service-name> --tail 50
```

---

### Step 2 — Check the Headscale user account

Headscale manages the Tailscale VPN nodes. Confirm the default user exists:

```bash
docker exec familyshield-headscale headscale users list
```

Expected output:

```
ID | Name    | Created
1  | default | 2026-04-XX XX:XX:XX
```

If no users exist, create the default user:

```bash
docker exec familyshield-headscale headscale users create default
```

---

### Step 3 — Generate a pre-authentication key

A pre-auth key lets a device join the Tailscale network without manual approval. Use `--reusable` so you can enrol multiple test devices with one key.

```bash
docker exec familyshield-headscale headscale preauthkeys create \
  --user 1 \
  --reusable \
  --expiration 8760h
```

Output will look like:

```
Key: abc123def456abc123def456abc123def456abc123def456abc123def456abc123
```

**Copy the full key string.** You will use it in the next step. The key is valid for 1 year (8760 hours).

To verify the key was created:

```bash
docker exec familyshield-headscale headscale preauthkeys list --user 1
```

---

### Step 4 — Install Tailscale on the test device

On the device you want to enrol (use a phone or laptop):

**iPhone/iPad:** App Store → search `Tailscale` → install → open → Log in → Use auth key → paste the key from Step 3

**Android:** Google Play → `Tailscale` → install → open → Sign in → Use auth key → paste the key

**Windows/Mac:** Download from `https://tailscale.com/download` → install → click Tailscale icon → Log in → Use auth key → paste the key

After connecting, the device receives a `100.64.x.x` IP address from Headscale. Confirm it registered:

```bash
docker exec familyshield-headscale headscale nodes list
```

You should see the new device listed with an IP address in `100.64.0.0/10`.

---

### Step 5 — Install the mitmproxy CA certificate

The CA cert allows mitmproxy to inspect HTTPS traffic. Without it, you will see SSL errors when browsing and FamilyShield cannot extract content IDs.

On the enrolled device, while Tailscale is connected:

1. Open a browser and go to: `http://mitm.it`
2. The mitmproxy web server (on the FamilyShield VM) serves a certificate download page
3. Follow the per-OS instructions on that page to download and trust the certificate

**iPhone — trust the certificate after installing:**

Settings → General → About → Certificate Trust Settings → toggle ON next to `mitmproxy`

**Mac — trust the certificate after installing:**

Keychain Access → System keychain → find `mitmproxy` → double-click → Trust → Always Trust

**Windows — install to Trusted Root Certification Authorities store** (see step 5 in the Windows section of the Certificate Import Wizard).

To verify mitmproxy is intercepting traffic, tail its logs while browsing a site:

```bash
sudo docker logs familyshield-mitmproxy --follow
```

You should see HTTP request/response lines appear as you browse.

---

### Step 6 — Set the DNS server on the test device

For AdGuard DNS filtering to work, the device must use the FamilyShield server as its DNS resolver. AdGuard Home listens on port 53 on all host interfaces, so you point DNS at the server's Tailscale IP.

Find the server's Tailscale IP from the headscale node list:

```bash
docker exec familyshield-headscale headscale nodes list
```

Look for the row with the server hostname — note its `ADDRESSES` value (e.g., `100.64.0.1`).

Then on the test device, configure DNS to use that IP:

- **iPhone:** Settings → Wi-Fi → tap `ⓘ` next to network → Configure DNS → Manual → add `100.64.0.1` → remove others
- **Android:** Settings → Wi-Fi → long-press network → Modify → IP settings: Static → DNS 1: `100.64.0.1`
- **Android 9+:** Settings → Network → Private DNS → hostname: `100.64.0.1`
- **Windows:** Settings → Network & Internet → Wi-Fi → network name → DNS server assignment: Manual → Preferred DNS: `100.64.0.1`
- **Mac:** System Settings → Wi-Fi → Details → DNS → add `100.64.0.1` → remove others

Verify DNS is routing through AdGuard:

```bash
# From the test device terminal (or browser dev tools Network tab)
nslookup google.com 100.64.0.1
# Should return results from AdGuard's upstream resolver
```

Check AdGuard query log at `https://adguard-dev.everythingcloud.ca` (Cloudflare Zero Trust auth required) — your test browsing queries should appear.

---

### Step 7 — Verify end-to-end: browse a YouTube video

1. On the enrolled device, open a browser and watch a YouTube video (e.g., any video on youtube.com)
2. mitmproxy extracts the `video_id` and pushes it to Redis
3. The API worker pops the event from Redis, calls YouTube Data API, scores it with Groq, and writes to Supabase
4. The portal dashboard receives the new entry via Supabase Realtime and displays it in the Activity Feed

**Monitor each stage in real-time:**

```bash
# Terminal 1 — mitmproxy logs (shows intercepted requests)
sudo docker logs familyshield-mitmproxy --follow

# Terminal 2 — API worker logs (shows enrichment + AI scoring)
sudo docker logs familyshield-api --follow

# Terminal 3 — Redis queue depth (should spike then drain to 0)
sudo docker exec familyshield-redis redis-cli llen content_events
```

**In the portal:** go to `https://familyshield-dev.everythingcloud.ca` → Dashboard. The Activity Feed should show a new YouTube entry with title, channel, and risk score within about 30 seconds of watching the video.

---

### Step 8 — Register the device in the portal

The portal's Devices page lets you name devices and assign age profiles.

1. Open the portal: `https://familyshield-dev.everythingcloud.ca`
2. Click **Devices** in the nav bar
3. Click **Enrol Device**
4. Fill in:
   - **Device name:** e.g., `Test iPhone 15`
   - **IP address:** the `100.64.x.x` address assigned to the device (shown in `headscale nodes list`)
   - **Age profile:** `Moderate` for testing
5. Click **Enrol**

The device appears in the Devices list with a green Online status.

---

### Troubleshooting enrolment

| Symptom | Likely cause | Fix |
|---|---|---|
| `http://mitm.it` shows a normal site or 404 | Tailscale not connected, or mitmproxy not running | Confirm Tailscale shows Connected; check `docker compose ps` |
| SSL errors on all HTTPS sites | Certificate not trusted | Revisit Step 5; on iOS check Certificate Trust Settings toggle |
| No entries in Activity Feed after browsing | API worker not processing events | Check `docker logs familyshield-api`; confirm `YOUTUBE_API_KEY` is set in `.env` |
| DNS not resolving or very slow | Device DNS not pointed to server | Revisit Step 6; ping `100.64.0.1` from device to confirm VPN routing |
| Device not appearing in `headscale nodes list` | Wrong pre-auth key used or key expired | Re-run Step 3 to generate a fresh key; check Tailscale app shows Connected |
| Tailscale connects but no internet | mitmproxy not forwarding traffic | Check `docker logs familyshield-mitmproxy` for errors |

---

## 8. Daily Development Workflow

### Branching and Deployment Strategy

```
development branch (integration)
    │
    ├── feat/your-feature  ← you work here
    │        │
    │        ├── if iac/** changed → PR → review → merge
    │        │              ↓
    │        │          infra-dev.yml auto-runs
    │        │          (tofu apply → setup-cloudflare → smoke-infra → tighten-ssh)
    │        │              ↓
    │        │          deploy-dev.yml auto-runs
    │        │          (build → deploy via tunnel → smoke-test)
    │        │
    │        ├── if apps/** changed → PR → review → merge
    │        │              ↓
    │        │          deploy-dev.yml auto-runs
    │        │          (wait-for-infra → build → deploy → smoke-test)
    │        │
    │        └── if both changed → both workflows run (deploy waits for infra)
    │
    ├── Test in dev at: https://familyshield-dev.everythingcloud.ca
    │
    └── When ready for staging:
        ├── Create qa branch (ephemeral)
        └── Push to qa → deploy-staging.yml auto-runs → auto-teardown after tests
        
        When ready for production:
        ├── Delete qa branch
        ├── Create PR: development → main
        ├── Review PR (tofu plan posted as comment)
        └── Merge → deploy-prod.yml auto-runs with approval gate
```

---

## 14. Security Hardening Updates (2026-04-16)

The following security scaffolding is now part of the application codebase:

### 12.1 Portal Route Protection (Scaffold)

- File: `apps/portal/middleware.ts`
- Protected routes: `/`, `/alerts`, `/devices`
- Controlled by env vars:
  - `PORTAL_BASIC_AUTH_ENABLED`
  - `PORTAL_BASIC_AUTH_USERNAME`
  - `PORTAL_BASIC_AUTH_PASSWORD`

If auth is enabled but credentials are missing, portal fails safe with HTTP 503.

See detailed guide: `docs/developer-guide/portal-auth-scaffold.md`

### 12.2 Supabase Schema + RLS Baseline

- Migration folder: `apps/api/supabase/migrations/`
- Baseline migration:
  - `20260416_0001_familyshield_core_rls.sql`

This migration creates `devices`, `content_events`, and `alerts` with:

- RLS enabled on all tables
- Default-deny posture
- Least-privilege policies scoped by `parent_user_id = auth.uid()`

### 12.3 API Keying Rule for RLS Compatibility

- API worker now prefers `SUPABASE_SERVICE_ROLE_KEY` for server-side writes.
- Browser paths must continue to use `NEXT_PUBLIC_SUPABASE_ANON_KEY` only.

### 12.4 Supabase Inactive/Recovery Runbook

Portal now shows explicit degraded/offline state when Supabase is inactive instead of crashing.

Activation runbook: `docs/developer-guide/supabase-activation.md`

### What Changes Trigger What?

| Files Changed | Workflow Triggered | Environment |
|---|---|---|
| `iac/**` | `infra-dev.yml` | dev (IaC only) |
| `apps/**` | `deploy-dev.yml` | dev (app only via tunnel SSH) |
| Both | Both workflows (sequential) | dev (infra first, then app) |
| `iac/**` on `main` | `infra-prod.yml` | prod (requires manual approval) |
| `apps/**` on `main` | `deploy-prod.yml` | prod (requires manual approval) |

### SSH Availability During Development

| Scenario | SSH Method | Availability |
|---|---|---|
| **Normal dev work** | Tunnel: `ssh familyshield-dev` | ✅ Always available |
| **Debugging during infra deploy** | Public IP (temp) | ⚠️ Only while infra-dev.yml running |
| **After infra deploy completes** | Tunnel only (NSG tightened) | ✅ Always available |
| **Emergency** | Tunnel (fallback) | ✅ Always available |

### Branch Naming Convention

- `feat/` — new feature
- `fix/` — bug fix
- `iac/` — infrastructure changes only
- `docs/` — documentation only
- `chore/` — maintenance

### Commit Message Format (Conventional Commits)

```
feat(portal): add rule builder drag-and-drop
fix(mitm): handle cert pinning gracefully
iac(compute): increase boot volume to 100GB
docs(api): document enrichment worker endpoints
chore: update dependencies
```

---

## 9. Workflow Decision Matrix and Scenarios

This section clarifies **when to use which workflow** based on what you changed. This is the operational answer to: "I made a code change — what do I do now?"

### Quick Reference: What Changed → What Workflow

| What You Changed | Where | Workflow | Triggered? | Purpose |
|---|---|---|---|---|
| **App code** | `apps/api/src/` or `apps/portal/` or `apps/mitm/` | `deploy-dev.yml` | ✅ Auto on push to `development` | Build new Docker images, deploy via tunnel |
| **App config** | `apps/platform-config/` (headscale.yaml, grafana, etc.) | `deploy-platform-services.yml` | 🔲 Manual dispatch or use next section | Sync config files to VM without rebuilding images |
| **Infrastructure** | `iac/` modules, tfvars, or templates | `infra-dev.yml` | ✅ Auto on push to `development` | Run `tofu apply`, set up Cloudflare tunnel, harden SSH |
| **Both app + infra** | Any files in both `apps/` and `iac/` | Both workflows | ✅ Auto — sequential | Infra runs first (creates VM), then app runs (deploys to it) |
| **Docs only** | `docs/`, `README.md`, `.github/workflows/` | `pr-check` (lint only) | ✅ Auto on PR | No deployment triggered |

### Scenario 1: You Modified the API Enricher (YouTube Scraper)

**Changed files:**
```
apps/api/src/enrichers/youtube.ts
apps/api/src/llm/router.ts
```

**Workflow to use:** `deploy-dev.yml` (automatic on push to `development`)

**Why:** These are app code changes. You need to:
1. Rebuild the Docker image with new code
2. Push to GHCR
3. Pull and restart the API container on the VM

**What deploy-dev.yml does:**
```
wait-for-infra (checks if infra also running)
  ↓
verify-tunnel (pre-flight: is tunnel reachable?)
  ↓
build-and-push (docker build api:arm64 → GHCR)
  ↓
deploy-app-dev (SSH via tunnel → pull image → docker compose up -d)
  ↓
smoke-test (check /api/health endpoint)
```

**Expected time:** 8-12 minutes  
**Success indicator:** Portal loads, `curl https://familyshield-dev.everythingcloud.ca/api/health` returns 200

---

### Scenario 2: You Updated Headscale Configuration (DNS/VPN)

**Changed files:**
```
apps/platform-config/headscale/headscale.yaml
```

**Workflow to use:** `deploy-platform-services.yml` (manual dispatch)

**Why:** Configuration files don't need a full Docker rebuild. You just need to:
1. Copy the new config to VM
2. Restart the headscale container

**How to trigger:**

Go to GitHub → Actions → `Deploy Platform Services` → `Run workflow`:

- Select environment: `dev`
- Services to restart: `headscale` (or choose all)
- Click **Run workflow**

**What deploy-platform-services.yml does:**
```
Sync apps/platform-config/ to VM
  ↓
Restart selected services (headscale, adguard, grafana, etc.)
```

**Expected time:** 3-5 minutes  
**Success indicator:** `docker logs familyshield-headscale | tail` shows no errors, tunnel shows ACTIVE

---

### Scenario 3: You Fixed a Bug in the mitmproxy Addon

**Changed files:**
```
apps/mitm/familyshield_addon.py
apps/mitm/requirements.txt
```

**Option A (Full Rebuild - Recommended):**

Use `deploy-dev.yml` — triggers automatically when you push.

**Why:** mitmproxy addon is built into the Docker image. Changes require full rebuild to update the image.

**Expected time:** 8-12 minutes

**Option B (Quick Development Iteration - Temporary):**

Use `deploy-platform-services.yml` manually if:
- You only changed Python logic (not requirements.txt)
- You want to test without waiting for Docker build

**Warning:** This copies the source code to the VM but does NOT rebuild the Docker image. The container might have an older version. Use only for quick debugging — always use deploy-dev.yml for final commits.

---

### Scenario 4: You Changed OCI Network Settings (NSG, Subnet)

**Changed files:**
```
iac/modules/oci-network/
iac/environments/dev/terraform.tfvars (updated CIDR blocks, etc.)
```

**Workflow to use:** `infra-dev.yml` (automatic on push to `development`)

**Why:** These are infrastructure changes managed by OpenTofu. You need to:
1. Run `tofu plan` (shows what will change)
2. Run `tofu apply` (creates/updates OCI resources)
3. Set up Cloudflare tunnel on the new/updated VM
4. Harden SSH after verification

**What infra-dev.yml does:**
```
deploy-infra-dev (tofu apply — 8 min)
  ↓
setup-cloudflare-dev (create tunnel, start cloudflared — 3 min)
  ↓
smoke-infra-dev (verify tunnel is ACTIVE — 1 min)
  ↓
tighten-ssh-dev (restrict SSH to admin IP — 2 min)
```

**Expected time:** 12-15 minutes  
**Success indicator:** New NSG rules are in place, tunnel is ACTIVE, portal loads

---

### Scenario 5: You Changed Both API Code AND Added a New Terraform Module

**Changed files:**
```
apps/api/src/enrichers/new-platform.ts
iac/modules/new-service/main.tf
```

**Workflow to use:** Both workflows trigger automatically in sequence

**What happens:**

```
Push to development
  ├── iac/** detected → infra-dev.yml starts
  │   └─ (tofu apply — may take 12-15 min)
  │
  └── apps/** detected → deploy-dev.yml starts
      └─ Immediately polls: "Is infra-dev still running?"
      
      If infra-dev is running:
        Wait up to 10 minutes for it to finish
        
      Once infra-dev completes:
        build-and-push (Docker build)
        deploy-app-dev (Deploy via tunnel)
        smoke-test
```

**Expected total time:** 20-25 minutes (15 min infra + 8 min app, mostly parallel)  
**Success indicator:** Both workflows show green checkmarks, portal is accessible

---

### Scenario 6: You Added a New GitHub Actions Workflow File

**Changed files:**
```
.github/workflows/new-workflow.yml
```

**Workflow to use:** `pr-check` runs (lint only, no deployment)

**Why:** Workflow files don't trigger deployments — they ARE part of the deployment system. Changes to `.github/workflows/` are validated but not deployed.

**Expected time:** 2-3 minutes (lint only)  
**Success indicator:** `pr-check` passes (lint, no deployment)

---

### When to Use `deploy-platform-services.yml` (Manual Utility Workflow)

This workflow is for **configuration-only changes** when you want to avoid a full Docker rebuild:

| Scenario | Use `deploy-platform-services` | Reason |
|---|---|---|
| Changed `apps/platform-config/headscale/headscale.yaml` | ✅ Yes | Config-only change; no rebuild needed |
| Changed `apps/platform-config/grafana/provisioning/` | ✅ Yes | Grafana configs; no rebuild needed |
| Changed `apps/platform-config/ntfy/*.conf` | ✅ Yes | ntfy config; no rebuild needed |
| Changed `apps/mitm/familyshield_addon.py` and `requirements.txt` | ⚠️ Depends | If `requirements.txt` changed: use `deploy-dev.yml` (rebuilds image). If only `.py`: can use `deploy-platform-services` for quick test. |
| Changed `apps/api/src/enrichers/youtube.ts` | ❌ No | App code change — use `deploy-dev.yml` |
| Changed `iac/modules/oci-compute/` | ❌ No | Infrastructure change — use `infra-dev.yml` |

**How to trigger manually:**

```bash
# GitHub UI: Actions → Deploy Platform Services → Run workflow
# Or via CLI:
gh workflow run deploy-platform-services.yml \
  --ref development \
  -f environment=dev
```

---

### Decision Tree: "I made a change, what do I do?"

```
Did I change...?

├─ iac/ (IaC code, tfvars, templates)
│  └─→ USE: infra-dev.yml or infra-prod.yml
│      Auto-triggered on push
│
├─ apps/ (app code, Docker code)
│  ├─ If also changed iac/: Both workflows trigger (sequential)
│  └─ If apps/ only: USE: deploy-dev.yml or deploy-prod.yml
│     Auto-triggered on push
│
├─ apps/platform-config/ (config files only, no code)
│  └─→ USE: deploy-platform-services.yml (manual dispatch)
│      For quick config sync without rebuild
│
├─ docs/ or .github/workflows/
│  └─→ USE: pr-check (validation only, no deploy)
│      Auto-triggered on PR
│
└─ Multiple different things?
   └─→ Merge to main branch via PR, and both workflows run
```

---

### Success Indicators by Workflow

#### ✅ infra-dev.yml completed successfully:

- All 4 jobs are green (deploy-infra, setup-cloudflare, smoke-infra, tighten-ssh)
- Portal is reachable at `https://familyshield-dev.everythingcloud.ca`
- Tunnel is ACTIVE (visible in Cloudflare dashboard)
- SSH is restricted to admin IP (not 0.0.0.0/0 anymore)

#### ✅ deploy-dev.yml completed successfully:

- All 5 jobs are green (verify-tunnel, build-and-push, deploy-app, smoke-test)
- Portal loads normally
- API endpoint `/api/health` returns 200 or 403

#### ✅ deploy-platform-services.yml completed successfully:

- Config files are synced to `/opt/familyshield/apps/platform-config/`
- Restarted service shows no errors in logs
- (e.g., for headscale: tunnel still ACTIVE, `docker ps` shows headscale running)

---

### Common Mistakes

| Mistake | What Happens | Fix |
|---|---|---|
| Changing `apps/api/` but waiting for infra-dev workflow | You're waiting for the wrong workflow. App code changes trigger `deploy-dev`, not `infra-dev` | Look for `deploy-dev.yml` in Actions tab instead |
| Changing `iac/modules/` but triggering `deploy-dev` manually | The change won't be deployed to the VM (old IaC still in place) | Push to development branch; `infra-dev.yml` auto-triggers on `iac/**` changes |
| Merging to `main` without testing in `development` first | Your production environment may be broken | Always test in dev first: feature branch → dev PR → test → staging → main |
| Running `deploy-platform-services` with Docker code changes | Config syncs but new Docker image never builds | Use `deploy-dev` instead for code changes |

---

## 10. Architecture Overview

See [docs/architecture/README.md](../architecture/README.md) for C4 diagrams, wire diagrams, and flow diagrams.

**Quick summary:**

```
[Child Device] → [WireGuard VPN] → [OCI VM ca-toronto-1]
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
               [AdGuard DNS]     [mitmproxy SSL]      [Node-RED Rules]
                    │                    │                    │
                    └────────────────────┼────────────────────┘
                                         │
                                   [Redis Queue]
                                         │
                                   [API Worker]
                                   ├── YouTube API
                                   ├── Roblox API
                                   ├── Twitch API
                                   └── Groq/Anthropic AI
                                         │
                                   [Supabase DB]
                                         │
                              [Cloudflare Tunnel]
                                         │
                              [Next.js Portal]
                          familyshield.everythingcloud.ca
```

---

## 11. Working with Each Service

### AdGuard Home

- Admin UI: `https://adguard-dev.everythingcloud.ca` (Cloudflare Zero Trust auth)
- Config: `/opt/familyshield/data/adguard/`
- API docs: <http://localhost:3080/swagger>

### mitmproxy

- Web UI: `https://mitm-dev.everythingcloud.ca`
- Addon code: `apps/mitm/familyshield_addon.py`
- Logs: `docker logs familyshield-mitmproxy`

### API / Enrichment Worker

- Health: `https://familyshield-dev.everythingcloud.ca/api/health`
- Code: `apps/api/src/`
- Env vars: see `iac/templates/docker-compose.yaml.tpl`

### Portal (Next.js)

- URL: `https://familyshield-dev.everythingcloud.ca`
- Code: `apps/portal/`
- Local dev: `cd apps/portal && npm run dev` (requires tunnel or SSH port-forward)

---

## 12. Testing

```bash
# Unit tests (API)
cd apps/api && npm test

# Unit tests (portal)
cd apps/portal && npm test

# E2E tests (Playwright)
cd apps/portal && npx playwright test

# mitmproxy addon tests
cd apps/mitm && pytest tests/

# IaC tests (tofu validate)
cd iac && tofu validate
```

See [docs/qa-framework/README.md](../qa-framework/README.md) for full test strategy.

---

## 13. Contributing

### Getting Started with a Feature

1. Start from `development` branch (integration):

   ```bash
   git checkout development
   git pull origin development
   git checkout -b feat/your-feature-name
   ```

2. Make your changes with tests (see Section 10 for test commands)

3. Commit with Conventional Commits format:

   ```bash
   git add .
   git commit -m "feat(portal): add new component"
   ```

4. Push and open a Pull Request:

   ```bash
   git push -u origin feat/your-feature-name
   gh pr create --base development  # NOT main
   ```

5. GitHub Actions runs `pr-check`:
   - Lints your code (ESLint, black, tflint)
   - Validates IaC if you changed `iac/**` (posts `tofu plan` as PR comment)
   - Runs security scan

6. Address review feedback and merge to `development`

7. GitHub auto-deploys to dev:
   - If you changed `iac/**` → `infra-dev.yml` runs
   - If you changed `apps/**` → `deploy-dev.yml` runs
   - If both → both workflows run sequentially

8. Test in dev at `https://familyshield-dev.everythingcloud.ca`

### Promoting to Production

After dev testing passes:

1. Create `qa` branch from `development` and push (triggers `deploy-staging.yml`)
2. Run QA tests on staging at `https://familyshield-staging.everythingcloud.ca`
3. After staging passes, delete `qa` branch and create PR `development` → `main`
4. Merge to `main` (triggers `deploy-prod.yml` with manual approval gate)

### Finding Issues to Work On

Look for issues labelled `good-first-issue` or `help-wanted` in the GitHub repository.

### Need Help?

- **Architecture questions:** See [docs/architecture/README.md](../architecture/README.md)
- **Deployment troubleshooting:** See [docs/troubleshooting/infrastructure.md](../troubleshooting/infrastructure.md)
- **API development:** See [apps/api/README.md](../../apps/api/README.md) (if exists)
- **Portal development:** See [apps/portal/README.md](../../apps/portal/README.md) (if exists)

---

*FamilyShield · Everythingcloudsolutions · Canada · 2026*
