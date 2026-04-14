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

---

## 1. Prerequisites

### On your Windows laptop

| Tool | Purpose | Install |
|---|---|---|
| VS Code | Editor + Remote SSH | https://code.visualstudio.com |
| Git | Version control | https://git-scm.com |
| GitHub CLI | Repo management | `winget install GitHub.cli` |
| OCI CLI | Cloud operations | `pip install oci-cli` |
| OpenTofu | IaC | https://opentofu.org/docs/intro/install |
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
8. Bootstrap the Terraform state Object Storage bucket
9. Find the correct Ubuntu 22.04 ARM image OCID for ca-toronto-1 (update `iac/variables.tf`)
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
| Secret Name | Where to get it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → Profile → API Tokens → Create token (Zone:DNS:Edit + Tunnel) |
| `CLOUDFLARE_ZONE_ID` | Cloudflare → everythingcloud.ca → Overview → Zone ID |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare → Profile → Account ID |

### Application Secrets
| Secret Name | Where to get it |
|---|---|
| `ADGUARD_ADMIN_PASSWORD` | Choose a strong password |
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `GROQ_API_KEY` | console.groq.com → API Keys |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |

---

## 5. VS Code Remote SSH Setup

Add to `C:\Users\<YourName>\.ssh\config` on Windows:

```
Host familyshield-dev
    HostName       <VM_IP_from_tofu_output>
    User           ubuntu
    IdentityFile   ~/.ssh/familyshield
    ServerAliveInterval 60
    ServerAliveCountMax 3

Host familyshield-staging
    HostName       <STAGING_VM_IP>
    User           ubuntu
    IdentityFile   ~/.ssh/familyshield
    ServerAliveInterval 60
```

Then in VS Code:
1. Install extension: `Remote - SSH` (ms-vscode-remote.remote-ssh)
2. `Ctrl+Shift+P` → `Remote-SSH: Connect to Host`
3. Select `familyshield-dev`
4. Open folder: `/home/ubuntu/familyshield` (or `/opt/familyshield`)
5. VS Code will install the dev container extensions automatically

> **Note:** The VM IP is shown in the GitHub Actions deploy output under "Capture IaC outputs", or run `tofu output vm_public_ip` from the `iac/` directory locally.

---

## 6. First Deploy

```bash
# 1. Update the ARM image OCID in iac/variables.tf
#    (value from bootstrap-oci.sh output)

# 2. Commit and push to a feature branch
git checkout -b feat/phase-1-bootstrap
git add .
git commit -m "feat: initial IaC scaffold for Phase 1"
git push origin feat/phase-1-bootstrap

# 3. Open a Pull Request → GitHub Actions runs:
#    - Lint & Validate
#    - tofu plan (posted as PR comment — review it!)
#    - Security scan

# 4. Merge PR → GitHub Actions auto-deploys to dev

# 5. Check deploy at:
#    https://familyshield-dev.everythingcloud.ca
```

---

## 7. Daily Development Workflow

```
main branch
    │
    ├── feat/your-feature  ← you work here
    │        │
    │        └── PR → plan comment → review → merge
    │                                              │
    │                              auto-deploy dev ┘
    │                                              │
    │                           auto-deploy staging ┘
    │
    └── prod deploy: manual trigger via GitHub UI
```

### Branch naming convention
- `feat/` — new feature
- `fix/` — bug fix
- `iac/` — infrastructure changes only
- `docs/` — documentation only
- `chore/` — maintenance

### Commit message format (Conventional Commits)
```
feat(portal): add rule builder drag-and-drop
fix(mitm): handle cert pinning gracefully
iac(compute): increase boot volume to 100GB
docs(api): document enrichment worker endpoints
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
- API docs: http://localhost:3080/swagger

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

1. Create a feature branch from `main`
2. Make your changes with tests
3. Open a Pull Request — the plan comment will show infrastructure impact
4. Address review feedback
5. Merge — auto-deploys to dev then staging

**First time?** Look for issues labelled `good-first-issue`.

---

*FamilyShield · Everythingcloudsolutions · Canada · 2026*
