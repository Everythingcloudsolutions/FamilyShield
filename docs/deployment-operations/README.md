# FamilyShield Deployment Operations Guide

> Last updated: 2026-04-16  
> Audience: DevOps engineers and deployment operators  
> Platform: FamilyShield v1 — OCI ca-toronto-1, GitHub Actions, Cloudflare Tunnel

---

## Purpose of This Document

This guide provides practical, operational information for deploying and maintaining FamilyShield in dev, staging, and production environments. Use this to:

- Understand the SSH security model (deploy-wide-open, tighten-at-end)
- Deploy to each environment
- Verify deployment health
- Troubleshoot common deployment issues
- SSH into the VM after deployment

---

## SSH Security Model: Deploy-Wide-Open, Tighten-at-End

### Why This Approach?

FamilyShield uses a two-phase SSH security strategy:

**Phase 1 (Deploy):** SSH is wide open to `0.0.0.0/0` during deployment to guarantee all jobs can SSH to the VM without dynamic rule management complexity.

**Phase 2 (Secure):** After deployment verifies healthy (smoke-test passes), SSH is tightened to admin IP only (`173.33.214.49/32`).

### Why Not Dynamic Punch/Seal?

Earlier attempts to dynamically punch SSH open at deploy-start and seal at deploy-end failed with OCI CLI errors. The simpler approach (deploy-open, tighten-after) is more reliable:

- ✅ No dynamic NSG rule management during deployment
- ✅ SSH always works (0.0.0.0/0 during deploy phase)
- ✅ Security applied AFTER system verified healthy
- ✅ No chicken-and-egg lockout risk
- ✅ Easier to troubleshoot failures

### Key Points

- **SSH is not locked down during deployment** — this is intentional to avoid deployment failures
- **SSH IS locked down after smoke-test passes** — tighten-ssh job runs at the end
- **You can SSH via Cloudflare Zero Trust tunnel** — even after SSH is tightened to admin IP (Phase B: tunnel SSH, applied at the very end)
- **Admin IP is hardcoded**: `173.33.214.49/32` (Mohit's office/VPN IP)

---

## Pre-Deployment Checklist

Before triggering any deployment, verify:

- [ ] You're on the correct branch (`development` for dev, `qa` for staging, `main` for prod)
- [ ] All local tests pass: `npm test` in apps/api, `npm run test:e2e` in apps/portal
- [ ] All GitHub Secrets are configured in the repo (OCI credentials, Cloudflare token, API keys)
- [ ] The deployment pipeline is not already running (check GitHub Actions)
- [ ] No terraform state locks exist (check AWS S3 backend state file)

---

## Deploying to Each Environment

### Split Workflow Architecture (2026-04-16)

FamilyShield deployments are now split into separate workflows triggered by different file changes:

- **Infra workflows** (`infra-dev.yml`, `infra-prod.yml`) — triggered by `iac/**` changes
  - Deploy OCI infrastructure via `tofu apply`
  - Set up Cloudflare tunnel
  - Verify tunnel is active
  - Tighten SSH to admin IP only
  
- **App workflows** (`deploy-dev.yml`, `deploy-prod.yml`) — triggered by `apps/**` changes
  - Build and push Docker images
  - Deploy containers via Cloudflare tunnel SSH (never public IP)
  - Smoke test endpoints

Both workflows run independently. If you commit changes to both `iac/` and `apps/` at the same time, both workflows trigger and run in parallel.

### Dev Deployment (Infrastructure)

**Trigger:** Push to `development` with `iac/**` changes

```bash
# Locally: make iac changes
# Commit and push to development — infra-dev.yml triggers automatically
git add iac/
git commit -m "iac(compute): increase dev VM to 2 OCPU"
git push origin development

# Or manually trigger
gh workflow run infra-dev.yml --ref development
```

**Expected duration:** 12-15 minutes

**Pipeline jobs:**

1. `deploy-infra-dev` — OpenTofu apply (8 min) — Creates OCI VM, VCN, NSG with SSH 0.0.0.0/0
2. `setup-cloudflare-dev` — Cloudflare setup (3 min) — Tunnel + DNS + Access app; bootstrap docker-compose.yml
3. `smoke-infra-dev` — Tunnel verification (1 min) — Checks tunnel is ACTIVE and portal reachable
4. `tighten-ssh-dev` — SSH hardening (2 min) — Second tofu apply with `admin_ssh_cidrs = ["173.33.214.49/32"]`

**Post-deployment:**

- Portal: `https://familyshield-dev.everythingcloud.ca` (check tunnel is active)
- SSH via tunnel: `ssh -i ~/.ssh/familyshield ubuntu@ssh-dev.everythingcloud.ca` (Cloudflare access wall requires credentials)

### Dev Deployment (Application)

**Trigger:** Push to `development` with `apps/**` changes

```bash
# Locally: make app changes
# Commit and push to development — deploy-dev.yml triggers automatically
git add apps/
git commit -m "feat(api): add YouTube content enricher"
git push origin development

# Or manually trigger
gh workflow run deploy-dev.yml --ref development
```

**Expected duration:** 8-12 minutes

**Pipeline jobs:**

1. `wait-for-infra` — Concurrency check (if infra-dev also triggered, wait up to 10 min for it to complete)
2. `verify-tunnel` — Pre-flight check (confirm Cloudflare tunnel is reachable before wasting build time)
3. `build-and-push` — Docker build (4 min) — Builds api + portal for linux/arm64, pushes to GHCR
4. `deploy-app-dev` — App deployment (3 min) — SSH via Cloudflare tunnel, restart containers
5. `smoke-test` — Health check (1 min) — Portal and API health endpoints

**Post-deployment:**

- Portal: `https://familyshield-dev.everythingcloud.ca/` (should load normally)
- API: `https://familyshield-dev.everythingcloud.ca/api/health` (should return 200 or 403)

---

### Staging Deployment (Ephemeral)

Staging is ephemeral and spun up/torn down per QA cycle. Uses a **combined workflow** (not split like dev/prod) for simplicity since staging is temporary.

**Trigger:** Push to `qa` branch

```bash
# Create and push qa branch from development
git checkout development
git pull origin development
git checkout -b qa
git push -u origin qa

# This auto-triggers deploy-staging.yml (combined IaC + app workflow)
```

**Expected duration:** 20-25 minutes

**Pipeline jobs:** (combined — infra and app in sequence)

1. `deploy-infra-staging` — OCI infrastructure (8 min)
2. `setup-cloudflare-staging` — Tunnel setup (3 min)
3. `smoke-infra-staging` — Tunnel check (1 min)
4. `build-and-push` — Docker images (4 min)
5. `deploy-app-staging` — App deployment (2 min)
6. `smoke-test` — Health check (1 min)
7. `auto-teardown` — Destroy infrastructure (2 min) — runs automatically after tests complete

**After testing:** Delete `qa` branch and create PR `development` → `main` for production

```bash
git push origin --delete qa
gh pr create --base main --head development
```

**Note:** The `auto-teardown` job destroys all staging OCI resources to avoid burning Always Free tier credits. This is intentional and automatic.

---

### Production Deployment

Production uses split workflows (infra and app) with safety checks and manual approval gate.

**Trigger:** Merge PR from `development` → `main`

```bash
# Create PR after staging passes
gh pr create --base main --head development

# Review PR in GitHub UI
# Merge to main — this triggers both infra-prod.yml and deploy-prod.yml
```

**Expected duration:** 20-25 minutes (combined for infra + app)

**Safety checks:**

1. `infra-prod.yml`: `safety-check` job requires you to manually type `DEPLOY` in the workflow_dispatch input
2. GitHub Environment `prod` approval gate (configure in repo Settings → Environments)

**Pipeline jobs (Infra):**

1. `safety-check` — Manual confirmation (must type "DEPLOY")
2. `deploy-infra-prod` — OCI infrastructure (8 min)
3. `setup-cloudflare-prod` — Tunnel setup (3 min)
4. `smoke-infra-prod` — Tunnel check (1 min)
5. `tighten-ssh-prod` — SSH hardening (1 min)
6. `create-release` — GitHub Release for deployment record

**Pipeline jobs (App):**

1. `wait-for-infra` — Wait for infra workflow (up to 10 min)
2. `verify-tunnel` — Pre-flight tunnel check (1 min)
3. `promote-images` — Tag dev images as prod (2 min)
4. `deploy-app-prod` — App deployment (2 min)
5. `smoke-test` — Health check (1 min)
6. `create-release` — GitHub Release for deployment record

**Post-deployment:**

- Portal: `https://familyshield.everythingcloud.ca`
- API: `https://familyshield.everythingcloud.ca/api/health`

---

## Monitoring Deployment Progress

### Via GitHub UI

1. Go to **Actions** tab
2. Select the workflow (`infra-*` or `deploy-*`)
3. Click the running workflow
4. Watch each job progress in real-time

### Via `gh` CLI

```bash
# Watch infra-dev in real-time
gh run list --workflow infra-dev.yml --limit 1 --json status,conclusion,createdAt --watch

# Watch deploy-dev in real-time (app-only workflow)
gh run list --workflow deploy-dev.yml --limit 1 --json status,conclusion,createdAt --watch

# Get logs for specific job
gh run view <run-id> --log --log-failed
```

### Key Success Indicators — Infra Workflow

- ✅ `deploy-infra-*` completes — VM created, IaC outputs captured, SSH open to 0.0.0.0/0
- ✅ `setup-cloudflare-*` completes — Tunnel token written, cloudflared started via docker run --network host
- ✅ `smoke-infra-*` completes — Tunnel is ACTIVE, portal reachable via tunnel
- ✅ `tighten-ssh-*` completes — Second tofu apply runs, SSH restricted to admin IP only (173.33.214.49/32)

### Key Success Indicators — App Workflow

- ✅ `verify-tunnel` completes — Pre-check confirms cloudflared tunnel is reachable
- ✅ `build-and-push` completes — Docker images built for linux/arm64, pushed to GHCR
- ✅ `deploy-app-*` completes — SSH via Cloudflare tunnel succeeds, containers restarted
- ✅ `smoke-test` returns 200 — Portal accessible via tunnel, API health check passes

---

## Post-Deployment Verification

After deployment completes, verify the system is healthy:

### 1. Check Portal is Reachable

```bash
# Dev
curl -I https://familyshield-dev.everythingcloud.ca
# Expected: HTTP 200, 302, or 403 (all indicate success)

# Prod
curl -I https://familyshield.everythingcloud.ca
```

### 2. Check API Health Endpoint

```bash
# Dev
curl -I https://api-dev.everythingcloud.ca/health
# Expected: HTTP 200 or 403

# Prod
curl -I https://api.everythingcloud.ca/health
```

### 3. SSH into VM (Verify Post-Deployment)

**Option A: Via Cloudflare Zero Trust Tunnel (Post-SSH Restriction)**

```bash
# Cloudflare tunnel SSH (available even after SSH tightened to admin IP)
ssh -i ~/.ssh/familyshield \
  -o ProxyCommand="cloudflared access ssh --hostname ssh-dev.everythingcloud.ca" \
  ubuntu@ssh-dev.everythingcloud.ca
```

**Option B: Via Public IP (During Deployment Only)**

During deployment, SSH is open to `0.0.0.0/0`. After `tighten-ssh-{env}` job runs, this no longer works (unless you're on admin IP 173.33.214.49/32).

```bash
# Only works during deployment or from admin IP
VM_IP=$(grep "vm_public_ip" iac/outputs.tf | grep value | cut -d'"' -f2)
ssh -i ~/.ssh/familyshield ubuntu@$VM_IP
```

### 4. Check Docker Services on VM

Once SSH'd into the VM:

```bash
# Check running containers
docker ps

# Expected output:
# - familyshield-api (port 3001)
# - familyshield-portal (port 3000)
# - familyshield-cloudflared (tunneled, no exposed port)
# - redis, adguard, headscale, influxdb, grafana, node-red, ntfy (all running)

# Check docker-compose status
cd /opt/familyshield
docker compose ps

# View logs for troubleshooting
docker compose logs -f api      # API worker logs
docker compose logs -f portal   # Portal logs
docker compose logs -f cloudflared  # Tunnel logs (usually silent if healthy)
```

### 5. Verify SSH is Tightened (Post-Deployment)

```bash
# Query NSG rules via OCI CLI (requires OCI credentials)
oci network security-group-rule list \
  --network-security-group-id <nsg-ocid> \
  --output json | jq '.data[] | select(.direction=="INGRESS" and (.protocol=="6" or .protocol=="all")) | .source'

# Expected output: Should show ONLY "173.33.214.49/32" (admin IP)
# Should NOT show "0.0.0.0/0" (wide-open) after tighten-ssh completes
```

---

## Troubleshooting Deployment Failures

### Failure: `deploy-infra-*` fails

**Common causes:**

- OCI quota exhausted (check Always Free tier usage)
- OCI API rate limiting
- Terraform state lock (another deployment in progress)

**Debug steps:**

```bash
# Check OCI quota
oci compute instance list --compartment-id <compartment-id>

# Check terraform state
aws s3 ls s3://familyshield-tfstate/dev/terraform.tfstate

# Unlock state if stuck
aws s3 rm s3://familyshield-tfstate/dev/.terraform.lock.hcl
```

**Fix:** Retry the workflow after waiting 5 minutes.

### Failure: `deploy-app-*` fails with "no configuration file provided: not found"

**Cause:** `docker-compose.yml` missing on VM (cloud-init didn't complete or failed silently)

**Debug:**

```bash
ssh ubuntu@<vm-ip>
ls -la /opt/familyshield/docker-compose.yml
```

**Fix:** The `deploy-app-*` step includes a bootstrap that checks for this and renders the file if missing. If it still fails, SSH into VM and manually:

```bash
cd /opt/familyshield
tofu output -raw docker_compose_yaml > docker-compose.yml
docker compose up -d
```

### Failure: `setup-cloudflare-*` fails

**Common causes:**

- Cloudflare API token has insufficient scopes (needs Zone DNS + Tunnel + Access)
- Invalid CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_ZONE_ID
- OCI CLI error when querying tunnel state

**Debug:**

```bash
# Test Cloudflare token locally
export CLOUDFLARE_API_TOKEN="<token>"
export CLOUDFLARE_ACCOUNT_ID="<id>"
export CLOUDFLARE_ZONE_ID="<id>"
bash scripts/cloudflare-api.sh setup dev "<tunnel-secret>" "admin@example.com"
```

**Fix:** Check token scopes in Cloudflare dashboard, update GitHub Secret if needed, retry.

### Failure: `smoke-test` fails (HTTP 5xx)

**Cause:** API or Portal container crashed or failed to start

**Debug:**

```bash
ssh ubuntu@<vm-ip>
docker compose logs api      # Check API logs
docker compose logs portal   # Check Portal logs
docker compose ps            # Check container status
```

**Fix:** Usually a configuration issue (missing env vars, database not reachable, Redis not running). Check GitHub Secrets are correct, restart containers:

```bash
docker compose up -d --force-recreate
```

### Failure: `tighten-ssh-*` fails

**Cause:** The `tighten-ssh-*` job runs a second `tofu apply` to tighten SSH. It can fail if:
- OCI credentials are invalid or expired
- Terraform state is corrupted or locked
- Incorrect `admin_ssh_cidrs` variable value

**Common error:** `Error: Error acquiring state lock`  
**Fix:** Another deployment is holding the lock. Wait 5 minutes and retry. The tighten-ssh job does NOT use OCI CLI NSG commands — it uses `tofu apply` instead, which keeps the NSG in IaC state and avoids state drift.

**Debug:** Check if NSG rules are correct:

```bash
# SSH to VM (during deployment when SSH is still open)
ssh ubuntu@<vm-ip>

# Query current NSG rules (check if already tightened or still open)
sudo ip route  # shows current firewall (if UFW active)

# After tighten-ssh completes, you can verify via Cloudflare tunnel
ssh -i ~/.ssh/familyshield ubuntu@ssh-dev.everythingcloud.ca
```

**Manual fix (if needed):** Re-run `tighten-ssh-{env}` job manually by triggering a new deploy workflow commit.

---

## Deployment Runbook (Quick Reference)

### Deploy Infra to Dev

```bash
# Trigger: Push to development with iac/** changes
git add iac/
git commit -m "iac(compute): update dev VM settings"
git push origin development

# Or manually trigger
gh workflow run infra-dev.yml --ref development

# Wait 12-15 min (infra-dev.yml: tofu apply → setup-cloudflare → smoke-infra → tighten-ssh)
# Verify: curl https://familyshield-dev.everythingcloud.ca
```

### Deploy App to Dev

```bash
# Trigger: Push to development with apps/** changes
git add apps/
git commit -m "feat(api): add YouTube enricher"
git push origin development

# Or manually trigger
gh workflow run deploy-dev.yml --ref development

# Wait 8-12 min (deploy-dev.yml: build-and-push → deploy-app → smoke-test)
# Verify: curl https://familyshield-dev.everythingcloud.ca/api/health
```

### Deploy to Staging (Ephemeral QA)

```bash
git checkout development && git pull
git checkout -b qa && git push -u origin qa

# Wait 20-25 min for auto-deploy (combined infra + app workflow)
# Run manual QA tests against https://familyshield-staging.everythingcloud.ca
# auto-teardown job removes staging environment automatically
```

### Deploy to Production

```bash
gh pr create --base main --head development
# Review PR in GitHub UI (tofu plan posted as comment)
# Approve and merge to main

# This triggers:
# - infra-prod.yml (requires manual "DEPLOY" confirmation) → sets up infrastructure
# - deploy-prod.yml (separate app workflow) → deploys containers

# Wait 20-25 min total
# Verify: curl https://familyshield.everythingcloud.ca/api/health
```

---

## Emergency Procedures

### Force Halt a Deployment

If a deployment is stuck or broken:

```bash
# Cancel running workflow
gh run cancel <run-id>

# Clear terraform state lock
aws s3 rm s3://familyshield-tfstate/dev/.terraform.lock.hcl

# Full cleanup (if environment is corrupted)
bash scripts/cleanup-cloudflare.sh dev
tofu destroy -var-file=environments/dev/terraform.tfvars
```

### SSH into a Stuck VM

If deployment is hanging and you need to debug:

```bash
# Get VM IP from last successful IaC output
VM_IP=$(aws s3 cp s3://familyshield-tfstate/dev/terraform.tfstate - | jq -r '.outputs.vm_public_ip.value')

# SSH (0.0.0.0/0 is open during deploy)
ssh -i ~/.ssh/familyshield ubuntu@$VM_IP

# Check cloud-init status
cloud-init status
sudo cloud-init analyze show
sudo tail -f /var/log/cloud-init-output.log

# Manually trigger docker-compose
cd /opt/familyshield
docker compose up -d
```

---

## References

- **Full troubleshooting log:** `/docs/troubleshooting/infrastructure.md` — Read this for deep-dive into past issues
- **Deployment workflows:** `.github/workflows/deploy-{dev,staging,prod}.yml`
- **Cloudflare API script:** `scripts/cloudflare-api.sh`
- **IaC modules:** `iac/modules/`

---

*FamilyShield — Intelligent Parental Control Platform*  
*Operated by Mohit (Everythingcloudsolutions) — Toronto, Canada*
