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

### Dev Deployment

**Trigger:** Manual via `gh` CLI or GitHub UI

```bash
# Option 1: CLI
gh workflow run deploy-dev.yml --ref development

# Option 2: GitHub UI
# 1. Go to Actions tab
# 2. Click "Deploy → Dev"
# 3. Click "Run workflow" → "Run workflow"
```

**Expected duration:** 15-20 minutes

**Pipeline jobs:**

1. `deploy-infra-dev` — IaC (10 min) — Creates OCI VM, VCN, storage
2. `build-and-push` — Docker images (3 min)
3. `deploy-app-dev` — SSH deploy (2 min)
4. `setup-cloudflare-dev` — Tunnel + DNS (3 min)
5. `smoke-test` — Portal HTTP check (1 min)
6. `tighten-ssh-dev` — Restrict to admin IP (1 min)

**Post-deployment:**

- Portal: `https://familyshield-dev.everythingcloud.ca` (should load)
- API: `https://api-dev.everythingcloud.ca/health` (should return 200 or 403)
- SSH: `ssh -i ~/.ssh/familyshield ubuntu@<vm-ip>` or via Cloudflare tunnel

---

### Staging Deployment (Ephemeral)

Staging is ephemeral and spun up/torn down per QA cycle.

**Trigger:** Create `qa` branch from `development`

```bash
# Create and push qa branch
git checkout development
git pull origin development
git checkout -b qa
git push -u origin qa

# This auto-triggers deploy-staging.yml
# GitHub Actions will deploy to staging
```

**Expected duration:** 20-25 minutes

**Pipeline jobs:** Same as dev (6 jobs)

**After testing:** Delete `qa` branch and create PR `development` → `main` for production

```bash
git push origin --delete qa
gh pr create --base main --head development
```

**Staging auto-teardown:** After integration tests complete (pass or fail), the `auto-teardown` job runs automatically and tears down the staging environment + deletes the `qa` branch.

---

### Production Deployment

Production requires manual approval in GitHub Environment.

**Trigger:** Merge PR from `development` → `main`

```bash
# Create PR after staging passes
gh pr create --base main --head development

# Approve PR in GitHub UI
# Merge to main — this triggers deploy-prod.yml
```

**Expected duration:** 20-25 minutes (same as staging)

**Approval gate:** GitHub Environment `prod` requires manual approval (configured in repo Settings → Environments)

**Post-deployment:**

- Portal: `https://familyshield.everythingcloud.ca`
- API: `https://api.everythingcloud.ca/health`

---

## Monitoring Deployment Progress

### Via GitHub UI

1. Go to **Actions** tab
2. Select the workflow (Deploy → Dev / Staging / Prod)
3. Click the running workflow
4. Watch each job progress in real-time

### Via `gh` CLI

```bash
# Watch deploy-dev in real-time
gh run list --workflow deploy-dev.yml --limit 1 --json status,conclusion,createdAt --watch

# Get logs for specific job
gh run view <run-id> --log --log-failed
```

### Key Success Indicators

- ✅ `deploy-infra-*` completes — VM created, IaC outputs captured
- ✅ `build-and-push` completes — Docker images pushed to GHCR
- ✅ `deploy-app-*` completes — API and Portal containers running
- ✅ `setup-cloudflare-*` completes — Tunnel token written, cloudflared restarted
- ✅ `smoke-test` returns 200 — Portal is reachable and responding
- ✅ `tighten-ssh-*` completes — SSH restricted to admin IP only

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

**Cause:** OCI CLI command error or NSG not found

**Common error:** `Error: No such command 'nsg-rules'`  
**Fix:** Update to `oci network security-group-rule` commands (see docs/troubleshooting/infrastructure.md Issue 12)

---

## Deployment Runbook (Quick Reference)

### Deploy to Dev

```bash
gh workflow run deploy-dev.yml --ref development
# Wait 15-20 min
# Verify: curl https://familyshield-dev.everythingcloud.ca
```

### Deploy to Staging (Ephemeral QA)

```bash
git checkout development && git pull
git checkout -b qa && git push -u origin qa
# Wait 20-25 min for auto-deploy
# Run manual QA tests
# auto-teardown job removes staging at end
```

### Deploy to Production

```bash
gh pr create --base main --head development
# Approve PR in GitHub UI
# Merge to main — auto-triggers deploy-prod.yml
# Wait 20-25 min
# Verify: curl https://familyshield.everythingcloud.ca
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
