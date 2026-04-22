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

### Step 2 — Ensure the Headscale user exists

Headscale organises nodes into users (namespaces). FamilyShield uses a single user named `familyshield`:

```bash
docker exec familyshield-headscale headscale users list
```

If `familyshield` is not in the list, create it:

```bash
docker exec familyshield-headscale headscale users create familyshield
```

---

### Step 3 — Generate a pre-authentication key

A pre-auth key lets any device join the VPN without the admin needing to manually approve each registration. Use `--reusable` so the same key works for all family devices.

```bash
docker exec familyshield-headscale headscale preauthkeys create \
  --user familyshield \
  --reusable \
  --expiration 8760h
```

Output:

```
Key | Created             | Ephemeral | Reusable | Key
----+---------------------+-----------+----------+-----------------------------------------------------------
1   | 2026-04-18 12:00:00 | false     | true     | abc123def456abc123def456abc123def456abc123def456
```

**Copy only the last column** (the hex string). This is the enrolment key.

Verify it was created:

```bash
docker exec familyshield-headscale headscale preauthkeys list --user familyshield
```

**Delivering the key to the parent without copy-pasting from CLI:**

Option 1 — send via iMessage/WhatsApp from your desktop to the parent's phone:
```bash
# Capture key into a variable (macOS)
KEY=$(docker exec familyshield-headscale headscale preauthkeys create \
  --user familyshield --reusable --expiration 8760h \
  | awk 'NR==3{print $NF}')
echo "FamilyShield enrolment key: $KEY"
# Copy from terminal → paste into iMessage/WhatsApp/Signal
```

Option 2 — generate a QR code the parent can scan from the VM terminal:
```bash
# Install qrencode if not present
sudo apt-get install -y qrencode

# Print as a QR code in the terminal — scan with the parent's phone
echo -n "$KEY" | qrencode -t UTF8
```

---

### Step 4 — Install Tailscale on the test device using the custom control server URL

The Tailscale app must be pointed at the FamilyShield Headscale server **before** connecting. The server URL is the critical step that replaces the old "paste a 64-char key on first screen" flow.

**VPN server URL:**
- Dev: `https://vpn-dev.everythingcloud.ca`
- Prod: `https://vpn.everythingcloud.ca`

#### iPhone/iPad

1. App Store → install `Tailscale`
2. Open app → tap gear icon or find **"Use a custom control server"** before tapping Log in
3. Enter the VPN server URL → Save
4. Tap **Log in** → paste the pre-auth key from Step 3 when prompted → Connect
5. Tap **Allow** to add VPN configuration

#### Android

1. Google Play → install `Tailscale`
2. Open app → three-dot menu `⋮` → **Settings** or **Custom control server**
3. Enter the VPN server URL → Save
4. Tap **Log in** → paste the pre-auth key → Connect → tap **OK** for VPN permission

#### Windows/Mac

1. Download from `https://tailscale.com/download` → install
2. Click Tailscale icon → Log in → browser opens
3. Look for **"Use a custom control server"** → enter VPN server URL → Save
4. Paste the pre-auth key → Sign in

After connecting, the device receives a `100.64.x.x` IP from Headscale. Confirm it registered:

```bash
docker exec familyshield-headscale headscale nodes list
```

You should see the device listed with an IP in `100.64.0.0/10`.

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

Each service is documented with five parts: what it does, how it is deployed, first-time setup commands, how to verify it is working, and where to find troubleshooting guidance.

---

### 11.1 Headscale (VPN Server)

**What it does**

Headscale is the VPN server that manages all connected Tailscale clients. When a child's device installs Tailscale and enters the enrolment key you provide, the device connects to Headscale and receives a private IP address on the `100.64.0.0/10` network. Headscale also pushes a DNS server configuration to every connected Tailscale client, pointing all DNS queries to the AdGuard container at `172.20.0.2`. This means the child never manually configures DNS — it happens automatically as part of the VPN connection.

**How it's deployed**

Container name: `familyshield-headscale`  
Port: `8080` (Tailscale coordination endpoint — reachable by child devices via Cloudflare tunnel)  
Config volume: `/opt/familyshield/data/headscale/`

**First-time setup**

Run these commands once after the first successful `infra-dev.yml` deployment:

```bash
ssh -i ~/.ssh/familyshield ubuntu@ssh-dev.everythingcloud.ca

# Create a user for the parent account
docker exec familyshield-headscale headscale users create parent

# Confirm creation and note the numeric user ID
docker exec familyshield-headscale headscale users list

# Create a reusable pre-authentication key (1 year expiry)
docker exec familyshield-headscale headscale preauthkeys create \
  --user 1 \
  --reusable \
  --expiration 8760h
# Output: tskey-client-K6cX7mZ8wP9qYnK2jL3mOp4rQsT5uV6w
# Copy this key — give it to the parent for device enrolment
```

**Verify it's working**

```bash
docker exec familyshield-headscale headscale nodes list
# Expected: table listing connected devices with 100.64.x.x addresses
# An empty table is normal before any devices connect
```

**Troubleshooting**

See [`../troubleshooting/README.md#headscale--tailscale-vpn-issues`](../troubleshooting/README.md#headscale--tailscale-vpn-issues)

---

### 11.2 AdGuard Home (DNS Filtering)

**What it does**

AdGuard Home intercepts all DNS queries from child devices and blocks adult content, gambling sites, and malware domains before the device can reach them. Child devices receive the AdGuard DNS server address (`172.20.0.2`) automatically from Headscale when Tailscale connects — no manual DNS configuration is needed on child devices.

The admin UI requires authentication, but DNS queries on port 53 do not — this is correct and expected behavior. DNS is stateless UDP; requiring credentials on port 53 would break DNS entirely. The admin UI at `adguard-dev.everythingcloud.ca` is protected by Cloudflare Zero Trust email login and is only for IT admins changing settings.

**How it's deployed**

Container name: `familyshield-adguard`  
Ports: `53` (DNS queries — no auth required, stateless UDP), `80` (admin web UI — auth required)  
Config volume: `/opt/familyshield/data/adguard/`  
API docs: `http://localhost:3080/swagger` (via SSH port-forward)

**First-time setup**

AdGuard requires a one-time setup wizard before the admin UI becomes available on port 80:

```bash
# On your local machine: SSH port-forward to the setup wizard
ssh -L 3000:172.20.0.2:3000 -i ~/.ssh/familyshield ubuntu@ssh-dev.everythingcloud.ca -N
# Leave this terminal open

# Open a browser and go to:
# http://localhost:3000
```

In the Setup Wizard:

1. Set **Admin Web Interface** port to `80` (must be 80 — if left on 3000 it conflicts with the portal container)
2. Set **DNS** port to `53`
3. Set a strong admin password
4. Complete the wizard

After setup, the wizard URL (`localhost:3000`) closes. The admin UI moves permanently to port 80.

**Accessing the admin UI after setup:**

- Via Cloudflare tunnel: `https://adguard-dev.everythingcloud.ca` (requires Cloudflare Zero Trust email login)
- Via SSH port-forward if tunnel is down: `ssh -L 3080:172.20.0.2:80 -i ~/.ssh/familyshield ubuntu@<vm-ip> -N` then open `http://localhost:3080`

**Verify it's working**

```bash
# Check the container is running
docker ps | grep adguard

# Test DNS resolution using AdGuard as the resolver
nslookup google.com 172.20.0.2
# Expected: returns a valid IP address (e.g. 142.251.41.14)
```

**Troubleshooting**

See [`../troubleshooting/README.md#adguard-home-issues`](../troubleshooting/README.md#adguard-home-issues)

---

### 11.3 mitmproxy (HTTPS Inspection)

**What it does**

mitmproxy is a transparent HTTPS proxy that sits between child devices and the internet. When a child browses YouTube, Roblox, Discord, or Twitch, mitmproxy decrypts the HTTPS traffic, extracts the content identifier (video ID, game place ID, guild ID, or channel name), pushes it to the Redis queue, and re-encrypts and forwards the traffic so the child sees the content normally. mitmproxy does not store any content — only IDs and metadata.

The certificate installation page at `http://mitm.it` is hardcoded into mitmproxy itself; it is an official mitmproxy server that hosts CA certificates for download. When a child device visits `http://mitm.it` while connected to Tailscale, mitmproxy intercepts the request and serves its own certificate download page. This is the mechanism by which the child's device gets the certificate it needs to trust the mitmproxy CA.

**How it's deployed**

Container name: `familyshield-mitmproxy`  
Ports: `8888` (transparent proxy), `8889` (alternative proxy mode), `8081` (web UI — debugging only)  
Addon code: `apps/mitm/familyshield_addon.py`  
Web UI: `https://mitm-dev.everythingcloud.ca`  
Logs: `docker logs familyshield-mitmproxy`

**First-time setup**

mitmproxy starts automatically via `docker compose` and generates its CA certificate on first start — no server-side manual setup is required. Setup is per child device and must be done once on each enrolled device:

**iOS (run these steps while Tailscale is connected):**

1. Safari → `http://mitm.it`
2. Tap "iOS" → download profile
3. Settings → General → VPN & Device Management → Install Profile
4. Settings → General → About → Certificate Trust Settings → toggle ON next to `mitmproxy`

**Android (run these steps while Tailscale is connected):**

1. Browser → `http://mitm.it`
2. Tap "Android" → download certificate
3. Settings → Security → Install Certificate from Storage

**Verify it's working**

```bash
# Check the container is running
docker ps | grep mitmproxy

# Watch live traffic — run this while browsing on an enrolled device
docker logs familyshield-mitmproxy --tail 20
# Expected: lines of HTTP request/response entries for sites visited
```

**Troubleshooting**

See [`../troubleshooting/README.md#mitmproxy-ssl-inspection-issues`](../troubleshooting/README.md#mitmproxy-ssl-inspection-issues)

---

### 11.4 ntfy (Push Notifications)

**What it does**

ntfy delivers real-time push alerts to the parent's phone when high or critical risk content is detected. When the API worker scores a content event as high or critical risk, it posts to the `familyshield-alerts` topic on the ntfy server. The parent's phone, with the ntfy app installed and subscribed to that topic, receives the push notification within seconds.

**How it's deployed**

Container name: `familyshield-ntfy`  
Port: `2586` (HTTP API and web UI)  
Web: `https://notify-dev.everythingcloud.ca`

**First-time setup**

```bash
ssh -i ~/.ssh/familyshield ubuntu@ssh-dev.everythingcloud.ca

# Create a parent user — the -it flag is required because this is interactive (prompts for password)
docker exec -it familyshield-ntfy ntfy user add parent

# Grant the user read/write access to the alert topic
docker exec familyshield-ntfy ntfy access parent familyshield-alerts rw
```

**Parent phone setup:**

1. Install ntfy app (App Store or Google Play — search "ntfy")
2. Open app → tap "+" or "Subscribe to topic"
3. Enter topic: `familyshield-alerts`
4. Done — push notifications arrive when the API dispatches alerts

**Verify it's working**

```bash
# Check the container is running
docker ps | grep ntfy

# Verify the topic endpoint is reachable and shows messages
curl -v http://localhost:2586/familyshield-alerts
# Expected: HTTP 200 with a JSON message list (empty if no alerts have been dispatched yet)
```

**Troubleshooting**

See [`../troubleshooting/README.md#node-red-issues`](../troubleshooting/README.md#node-red-issues)

---

### 11.5 Supabase (Database)

**What it does**

Supabase is a hosted PostgreSQL database with built-in real-time WebSocket subscriptions. It stores three core tables: `devices` (enrolled child devices and their age profiles), `content_events` (every observed content ID with timestamp), and `alerts` (high and critical risk events with AI scores). Row Level Security is enabled on all tables so each parent only sees data for their own child's devices. The portal subscribes to the `alerts` table over WebSocket, which is how new alerts appear on the dashboard without a page refresh.

Supabase is hosted (not self-hosted on the OCI VM) to get automatic backups, built-in RLS support, real-time subscriptions, and to avoid consuming VM disk space for database storage.

**How it's deployed**

Hosted at [supabase.com](https://supabase.com) — not a container on the VM. Credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are stored as GitHub Secrets and injected into the API and portal at deploy time. The API worker uses `SUPABASE_SERVICE_ROLE_KEY` for server-side writes; the portal browser client uses only the `SUPABASE_ANON_KEY` (published as `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

**First-time setup**

In the Supabase dashboard → SQL Editor, run the following migration to create tables and enable RLS. The full migration file is also at `apps/api/supabase/migrations/20260416_0001_familyshield_core_rls.sql`.

```sql
-- Devices enrolled by a parent
CREATE TABLE devices (
  id BIGSERIAL PRIMARY KEY,
  parent_id UUID NOT NULL,
  device_ip INET NOT NULL,
  device_name TEXT,
  profile TEXT,
  enrolled_at TIMESTAMP DEFAULT now(),
  last_seen TIMESTAMP,
  CONSTRAINT unique_device_ip UNIQUE(device_ip)
);

-- All observed content events
CREATE TABLE content_events (
  id BIGSERIAL PRIMARY KEY,
  device_ip INET NOT NULL,
  source TEXT,
  content_id TEXT,
  captured_at TIMESTAMP DEFAULT now()
);

-- High and critical risk alerts
CREATE TABLE alerts (
  id BIGSERIAL PRIMARY KEY,
  device_ip INET NOT NULL,
  content_type TEXT,
  title TEXT,
  risk_level TEXT,
  ai_scores JSONB,
  created_at TIMESTAMP DEFAULT now(),
  dispatched_to_ntfy BOOLEAN DEFAULT false
);

-- Enable RLS with default-deny on all tables
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Least-privilege read policies scoped to the authenticated parent
CREATE POLICY "parent_devices_select"
  ON devices FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "parent_devices_insert"
  ON devices FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "parent_content_events_select"
  ON content_events FOR SELECT
  USING (
    device_ip IN (
      SELECT device_ip FROM devices WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "parent_alerts_select"
  ON alerts FOR SELECT
  USING (
    device_ip IN (
      SELECT device_ip FROM devices WHERE parent_id = auth.uid()
    )
  );
```

**Verify it's working**

In the Supabase dashboard → Table Editor, confirm the three tables exist and show zero rows (correct for a fresh deployment). Rows appear after device enrolment and the first monitored browsing session.

**Troubleshooting**

See [`../troubleshooting/README.md#supabase-issues`](../troubleshooting/README.md#supabase-issues)

---

### 11.6 Redis (Event Queue)

**What it does**

Redis is the event queue that decouples mitmproxy from the API worker. When mitmproxy detects a content ID, it pushes a JSON event onto the `content_events` Redis list. The API worker polls this list, pops events one at a time, calls the appropriate platform API (YouTube, Roblox, Twitch, or Discord), runs AI risk scoring, and writes results to Supabase. This buffering means mitmproxy never blocks while waiting for API calls, and the API worker can process events at its own pace even during traffic bursts.

**How it's deployed**

Container name: `familyshield-redis`  
Port: `6379` (Redis default — internal to the Docker bridge network only, not exposed externally)  
No configuration files required. Redis starts with sensible defaults.

**First-time setup**

No first-time setup required. Redis starts automatically as part of `docker compose up` and is ready immediately. No password is configured because Redis is only reachable within the Docker bridge network and is not exposed to any external interface.

**Verify it's working**

```bash
# Confirm Redis responds to the standard health check
docker exec familyshield-redis redis-cli ping
# Expected: PONG

# List all keys (empty on fresh deployment; non-empty during active monitoring)
docker exec familyshield-redis redis-cli KEYS '*'
```

**Troubleshooting**

See [`../troubleshooting/README.md#redis-queue-issues`](../troubleshooting/README.md#redis-queue-issues)

---

### 11.7 API / Enrichment Worker

- Health: `https://familyshield-dev.everythingcloud.ca/api/health`
- Code: `apps/api/src/`
- Env vars: see `iac/templates/docker-compose.yaml.tpl`

### 11.8 Portal (Next.js)

- URL: `https://familyshield-dev.everythingcloud.ca`
- Code: `apps/portal/`
- Local dev: `cd apps/portal && npm run dev` (requires tunnel or SSH port-forward)

---

### 11.9 Portainer (Docker Management UI)

Portainer provides a browser-based UI to manage all Docker containers on the VM without needing SSH. From the Portainer dashboard you can: start/stop/restart containers, view real-time logs, execute shell commands inside containers, inspect images and volumes, and pull updated images. It is the primary tool for day-to-day operational troubleshooting.

#### How it's deployed

Container name: `familyshield-portainer`  
Port: `9000` (HTTP — exposed only via Cloudflare Tunnel, not on the internet directly)  
Data volume: `/opt/familyshield-data/portainer` (persistent — survives VM recreation)  
Docker socket: `/var/run/docker.sock` mounted read-only — allows Portainer to manage other containers

#### Access

- Via Cloudflare tunnel: `https://portainer-dev.everythingcloud.ca` (requires Cloudflare Zero Trust email login)
- Protected by the same email OTP as AdGuard and Grafana — your Cloudflare account email

#### Security model

Portainer has read-write access to the Docker socket, making it a high-privilege admin surface. It is protected by:

1. **Cloudflare Zero Trust** — email OTP required before the browser can reach localhost:9000 at all
2. **No public port** — port 9000 is not in the OCI security list; only reachable through the encrypted tunnel
3. **Persistent Portainer credentials** — set a strong admin password on first login; it is stored in `/opt/familyshield-data/portainer`

#### First-time setup

On first visit to `https://portainer-dev.everythingcloud.ca`:

1. Cloudflare Zero Trust will ask for your email OTP (enter your Cloudflare account email)
2. Portainer shows a "Create first admin user" screen — set a strong password and save it
3. Select **"Get Started"** → **Local** to manage the containers on the current VM
4. You will see all FamilyShield containers listed under **Containers**

#### Verify it's working

```bash
# On the VM — confirm container is running
docker ps | grep portainer
# Expected: familyshield-portainer   Up X minutes

# Health API
curl -s http://localhost:9000/api/status
# Expected JSON: {"Version":"...", "InstanceID":"..."}
```

#### Common uses

| Task | How |
| --- | --- |
| View container logs | Portainer → Containers → click container → Logs |
| Restart a crashed service | Portainer → Containers → select → Restart |
| Pull latest image | Portainer → Images → Pull image |
| Run a command inside container | Portainer → Containers → click container → Console → Connect |
| Check resource usage | Portainer → Containers → Stats column |

#### Troubleshooting

- If Portainer shows blank container list: check Docker socket mount (`/var/run/docker.sock:ro`)
- If `portainer-dev.everythingcloud.ca` returns 502: container stopped — SSH to VM and run `docker start familyshield-portainer`
- Password reset: `docker stop familyshield-portainer && docker rm familyshield-portainer` then `docker compose up -d portainer` — data is on the persistent volume so settings survive

---

### Common Admin Tasks

#### Add a New Child Device

```bash
# 1. Generate a new pre-authentication key
docker exec familyshield-headscale headscale preauthkeys create \
  --user 1 --reusable --expiration 8760h
# Output: tskey-client-...

# 2. Give the key to the parent to enter in the Tailscale app on the new device

# 3. After the parent connects, verify the device appears:
docker exec familyshield-headscale headscale nodes list
```

#### Check Service Health

```bash
# Show all containers and their current state
docker compose ps

# Show a formatted table with health status column
docker compose ps --format "table {{.Names}}\t{{.Status}}"
# Expected: all rows show "Up" or "Up (healthy)"
```

#### Increase Log Level for Debugging

```bash
# Set debug environment variable and restart affected services
export DEBUG=familyshield-*
docker compose restart api mitmproxy

# Tail logs from all services together
docker compose logs -f --tail 100
```

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
