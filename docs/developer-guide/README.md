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
7. [Daily Development Workflow](#7-daily-development-workflow)
8. [Architecture Overview](#8-architecture-overview)
9. [Working with Each Service](#9-working-with-each-service)
10. [Testing](#10-testing)
11. [Contributing](#11-contributing)
12. [Security Hardening Updates (2026-04-16)](#12-security-hardening-updates-2026-04-16)

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

## 7. Daily Development Workflow

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

## 12. Security Hardening Updates (2026-04-16)

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

## 8. Architecture Overview

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

## 9. Working with Each Service

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

## 10. Testing

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

## 11. Contributing

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
