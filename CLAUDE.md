# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Last updated: 2026-04-12

---

## Who Am I Talking To

- **Owner:** Mohit (Everythingcloudsolutions)
- **Location:** Canada
- **Currency:** Always use CAD ($) — never GBP or USD
- **Year:** 2026 — always use 2026 in dates, docs, comments, version refs
- **Git Workflow:** Always create feature/fix branches and PRs. NEVER merge to main without explicit user approval

---

## Project: FamilyShield

Intelligent parental control platform. Cloud-first, open source, IaC-driven.

**GitHub repo:** https://github.com/Everythingcloudsolutions/FamilyShield (private)
**Portal URL (dev):** https://familyshield-dev.everythingcloud.ca
**Portal URL (prod):** https://familyshield.everythingcloud.ca
**Domain:** familyshield.everythingcloud.ca (subdomain of everythingcloud.ca — Cloudflare)

---

## Development Commands

### API (TypeScript/Node.js)

```bash
cd apps/api
npm install                # Install dependencies
npm run dev               # Watch mode (tsx watch)
npm run build             # Compile to dist/
npm run start             # Run compiled code
npm test                  # Run jest tests
npm run test:coverage     # Test coverage report
npm run lint              # Run ESLint
npm run lint:fix          # Auto-fix linting issues
npm run typecheck         # Type-check without emitting
```

**Key files:** `package.json` defines scripts, Jest config in `jest.config.js`, tsconfig at `tsconfig.json`

### mitmproxy (Python)

```bash
cd apps/mitm
pip install -r requirements.txt    # Install dependencies
pytest                             # Run all tests
pytest tests/test_addon.py        # Run specific test file
pytest tests/test_addon.py::TestClass::test_method  # Run single test
pytest --cov=.                    # Run with coverage report
pytest -v                         # Verbose output
```

**Key files:** `requirements.txt` lists dependencies, `familyshield_addon.py` is the main addon, `tests/test_addon.py` has all test cases

### Infrastructure as Code (OpenTofu)

```bash
cd iac
tofu fmt -recursive                # Format HCL files
tofu fmt -recursive -check         # Check formatting without changing
tofu init -backend-config="key=dev/terraform.tfstate" -reconfigure
tofu validate                      # Validate syntax
tofu plan -var="environment=dev" -var-file="environments/dev/terraform.tfvars"
tofu apply -var="environment=dev" -var-file="environments/dev/terraform.tfvars" -auto-approve
```

**Key notes:**
- When `tofu apply` runs in workflows, it runs with `working_directory: iac/`, so var_file paths MUST be relative to iac/ (e.g., `environments/dev/terraform.tfvars`, NOT `iac/environments/dev/terraform.tfvars`)
- Full `tofu apply` requires OCI account and credentials. Use `tofu plan` locally to validate HCL without applying.

### Bootstrap & Deployment Scripts

```bash
bash scripts/bootstrap-oci.sh      # First-time OCI setup (10 steps)
bash scripts/setup-github.sh       # Configure GitHub environments & branch protection
bash scripts/cloudflare-api.sh     # Cloudflare resource management (API-driven)
```

### Cloudflare API Management

Cloudflare resources (tunnel, DNS records, access apps) are created and managed via the Cloudflare API, not Terraform. This is done in the `deploy-cloudflare.yml` workflow using `scripts/cloudflare-api.sh`:

```bash
# Manual setup (rarely needed)
export CLOUDFLARE_API_TOKEN="..."
export CLOUDFLARE_ACCOUNT_ID="..."
export CLOUDFLARE_ZONE_ID="..."

bash scripts/cloudflare-api.sh setup dev "<tunnel-secret>" "admin@example.com"
bash scripts/cloudflare-api.sh cleanup dev
```

**Why separate from IaC?**

- Terraform/OpenTofu struggles with state management when resources exist in cloud but not in state
- Cloudflare API is simpler for tunnel + DNS + access apps
- Decoupled architecture allows independent updates without triggering full IaC rebuild
- Easy cleanup via API if needed (e.g., environment torn down)

### Local Development (Without OCI)

These components can be developed and tested locally before deploying to OCI:

**API (Node.js):**

```bash
cd apps/api
npm install
npm run dev          # Watch mode on http://localhost:3001
npm test             # Run Jest tests
npm run lint         # Run ESLint
```

**mitmproxy addon (Python):**

```bash
cd apps/mitm
pip install -r requirements.txt
pytest -v            # Run all tests with verbose output
pytest tests/test_addon.py::TestClass::test_method  # Run single test
```

**Portal (Next.js) — once scaffolded:**

```bash
cd apps/portal
npm install
npm run dev          # Dev server on http://localhost:3000
npm test             # Run test suite
```

**IaC validation (OpenTofu):**

```bash
cd iac
tofu fmt -check      # Check formatting
tofu validate        # Validate HCL syntax
tofu plan -var-file environments/dev/terraform.tfvars  # Review changes (requires OCI credentials)
```

**Note:** Full integration testing requires deployed infrastructure (OCI VM, Supabase, Cloudflare). Use GitHub Actions workflows for E2E testing.

---

## Architecture — Never Change These Core Decisions

| Decision | Choice | Reason |
|---|---|---|
| Cloud provider | Oracle Cloud (OCI) ca-toronto-1 | Always Free 4 OCPU/24GB ARM — Canada |
| DNS + networking | Cloudflare Tunnel + Zero Trust | No open inbound ports |
| VPN | Tailscale / Headscale (self-hosted) | Removes 3-user limit |
| DNS filtering | AdGuard Home | Per-device profiles + REST API |
| SSL inspection | mitmproxy (transparent) | Captures content IDs from HTTPS |
| Database | Supabase (PostgreSQL + Realtime) | Free 500MB, WebSocket live updates |
| AI primary | Groq llama-3.3-70b-versatile | Free 500k tokens/day |
| AI fallback | Anthropic claude-haiku-4-5 | ~$0.02 CAD/month fallback |
| IaC | OpenTofu (Terraform-compatible) | Open source, full OCI provider |
| CI/CD | GitHub Actions | OIDC to OCI — no stored long-lived keys |
| Frontend | Next.js 14 on Cloudflare Pages | Free hosting, unlimited bandwidth |
| Container registry | GHCR (GitHub Container Registry) | Free for private repos |

---

## Monorepo Structure

```
FamilyShield/
├── CLAUDE.md                    ← YOU ARE HERE
├── SETUP.md                     ← First-time setup checklist
├── README.md                    ← Project overview
├── .env.example                 ← Secret template — never commit .env
├── FamilyShield.code-workspace  ← VS Code multi-root workspace
├── .devcontainer/               ← VS Code Remote on OCI ARM Ubuntu
├── .github/
│   ├── actions/                 ← Reusable: oci-login, tofu-plan, tofu-apply
│   └── workflows/               ← pr-check, deploy-dev, deploy-staging, deploy-prod
├── iac/
│   ├── main.tf / variables.tf / outputs.tf
│   ├── environments/dev|staging|prod/terraform.tfvars
│   ├── modules/
│   │   ├── oci-compartments/    ← 3 compartments + IAM policies
│   │   ├── oci-network/         ← VCN, subnet, security list
│   │   ├── oci-compute/         ← Always Free ARM VM
│   │   ├── oci-storage/         ← Object Storage (Terraform state + backups)
│   │   ├── cloudflare-dns/      ← Tunnel + DNS + Zero Trust access
│   │   ├── supabase/            ← Supabase project
│   │   └── docker-services/     ← docker-compose.yml renderer
│   └── templates/
│       ├── cloud-init.yaml.tpl  ← VM bootstrap: UFW, fail2ban, Docker, systemd
│       └── docker-compose.yaml.tpl ← All 10 services
├── apps/
│   ├── portal/                  ← Next.js 14 parent portal [IN PROGRESS]
│   ├── api/                     ← Node.js enrichment worker + Express health
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── worker/event-consumer.ts
│   │   │   ├── llm/router.ts    ← Groq → Anthropic fallback
│   │   │   └── enrichers/       ← youtube.ts, roblox.ts, twitch.ts, discord.ts
│   │   └── package.json (scripts: dev, build, test, lint, typecheck)
│   ├── mitm/                    ← mitmproxy Python addon
│   │   ├── familyshield_addon.py
│   │   ├── tests/test_addon.py
│   │   └── requirements.txt
│   ├── agent-iac/               ← [SCAFFOLD ONLY] IaC management agent
│   ├── agent-cloud/             ← [SCAFFOLD ONLY] Cloud environment agent
│   ├── agent-api/               ← [SCAFFOLD ONLY] Platform API agent
│   └── agent-mitm/              ← [SCAFFOLD ONLY] Traffic inspection agent
├── docs/
│   ├── architecture/README.md   ← C4 model L1-L3, Mermaid diagrams, wire diagram
│   ├── developer-guide/README.md
│   ├── qa-framework/README.md
│   ├── user-guide/README.md     ← Non-technical parent guide
│   ├── troubleshooting/README.md ← Developer + parent troubleshooting
│   └── diagrams/                ← draw.io / Excalidraw source files
└── scripts/
    ├── bootstrap-oci.sh         ← First-time OCI setup (10 steps)
    └── setup-github.sh          ← GitHub environments + branch protection
```

---

## High-Level Architecture

### Deployment Flow

```
PR opened → pr-check.yml runs → tofu plan posted as PR comment
    ↓
Merge to main (manual) → deploy-dev.yml → IaC deployment (OCI resources)
    ↓
    ├─→ deploy-cloudflare.yml → Cloudflare resources (tunnel, DNS, access)
    │
    ├─→ build-and-push → Docker images to GHCR
    │
    └─→ deploy-app-dev → App containers to dev VM
    
    ↓ (if all pass)
dev passes (health check) → deploy-staging.yml (same flow as above)
    ↓ (if staging passes)
Manual trigger → deploy-prod.yml (manual approval + same flow)
```

**Key Change (2026-04-13):**
Cloudflare resources (tunnel, DNS, access apps) are now managed by separate `deploy-cloudflare.yml` workflow using the Cloudflare API directly (not Terraform). This decouples Cloudflare from IaC state management, avoiding conflicts.

**Environments in GitHub:**
- `dev` — auto, no approval needed
- `staging` — auto after dev passes
- `prod` — **manual approval required** (Mohit must click Approve in GitHub UI)

**Cleanup:**
- Manual: `cleanup-cloudflare.yml` (workflow_dispatch) — remove Cloudflare resources if environment is torn down

### Service Architecture

All backend services run on a single OCI Always Free ARM VM (4 OCPU / 24GB RAM) in `ca-toronto-1`. Services communicate via:
- **Redis** (port 6379) — event queue between mitmproxy and API
- **Supabase** — PostgreSQL + Realtime WebSocket
- **Shared volumes** — config files mounted at /etc/familyshield/

```
┌─────────────────────────────────────────────────────────────┐
│  OCI ARM VM (Ubuntu 22.04)                                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─ Cloudflare Tunnel (outbound only)                       │
│  │  └─ mitmproxy (8888/8889) → Redis → API                 │
│  │                                                          │
│  ├─ DNS: AdGuard Home (53, 3080)                            │
│  ├─ VPN: Headscale (8080)                                  │
│  ├─ API: Node.js enrichment worker (3001)                   │
│  ├─ Time-series: InfluxDB (8086) + Grafana (3001)          │
│  ├─ Automations: Node-RED (1880)                            │
│  ├─ Notifications: ntfy (2586)                              │
│  └─ Cache: Redis (6379)                                    │
│                                                             │
│  All services managed by docker-compose via systemd        │
└─────────────────────────────────────────────────────────────┘
         ↓ HTTPS (Cloudflare Tunnel)
     ┌─────────────────┐
     │ Parent Portal   │
     │ (Next.js on     │
     │ Cloudflare      │
     │ Pages)          │
     └─────────────────┘
```

### Data Flow

1. **Device** connects via AdGuard + mitmproxy for DNS/HTTPS inspection
2. **mitmproxy** extracts content IDs (video_id, game_place_id, etc.) → Redis queue
3. **API worker** polls Redis → calls platform APIs (YouTube, Roblox, etc.) → AI risk scoring (Groq → Anthropic fallback)
4. **Results** stored in Supabase → **Portal** displays in real-time via WebSocket

---

## OCI Setup Details

| Item | Value |
|---|---|
| Tenancy region | ca-toronto-1 (Toronto, Canada) |
| VM shape | VM.Standard.A1.Flex (Always Free) |
| VM resources | 4 OCPU, 24GB RAM |
| Boot volume | 50GB |
| OS | Ubuntu 22.04 ARM64 |
| Compartments | familyshield-dev, familyshield-staging, familyshield-prod |
| State bucket | familyshield-tfstate (OCI Object Storage, versioned) |
| GitHub Actions auth | OCI IAM user + API key (no OIDC — simpler for Always Free) |

### Critical: Bootstrap Script Steps

The `bootstrap-oci.sh` script must be run ONCE before any `tofu apply`:

1. **Verify OCI CLI** — check credentials configured
2. **Cloud Guard** (optional) — security monitoring setup
3. **Create GitHub Actions IAM user** — `familyshield-github-actions` (asks for email)
4. **Generate API key** — uploaded to OCI, private key → GitHub secret `OCI_PRIVATE_KEY`
5. **Create dynamic group** — matches IAM user OCID
6. **Grant bootstrap IAM policy** — grants `any-user to manage all-resources in tenancy where request.user.id = '<OCID>'` (CRITICAL for compartment/policy creation)
7. **Create Terraform state bucket** — versioned Object Storage
8. **Find Ubuntu 22.04 ARM image** — for VM provisioning (update `iac/variables.tf` with OCID)
9. **Generate SSH key** — for VS Code Remote SSH access
10. **Summary** — output all GitHub secrets to configure

**Critical Detail:** Step 6 creates a bootstrap IAM policy that allows the GitHub Actions user to create compartments and policies. This policy uses `Allow any-user where request.user.id = ...` syntax (NOT `dynamic-group`) because the setup uses APIKey auth. Without this step, `tofu apply` will fail with 404-NotAuthorizedOrNotFound errors.

**Idempotency:** The script is idempotent — re-running it will skip existing resources and only create missing ones.

---

## Content Inspection — Per Platform

| Platform | DNS | mitmproxy | API | AI |
|---|---|---|---|---|
| YouTube / Shorts | ✅ | video_id | YouTube Data API v3 | Risk score |
| Roblox | ✅ | game_place_id | Roblox open API | Game risk |
| Discord | ✅ | guild_id, channel_id | Discord Bot API | NSFW flag |
| Twitch | ✅ | channel_name | Twitch API | Mature flag |
| Instagram | ✅ | reel_id (browser only) | No public API | Time-based |
| TikTok | DNS block | Cert pinning — blocked | No public API | Block <14 |
| Consoles/TV | DNS only | N/A | Console parental APIs | DNS only |

---

## Git Workflow

**Three-branch promotion process:**

```
Feature/Fix Branch → PR to DEVELOPMENT → Test & Review → Merge to development
                                                              ↓
                                               DEVELOPMENT → PR to MAIN → Merge to production
```

**When to use each branch:**
- **main** — Production-ready code only. Triggered for prod deployments.
- **development** — Integration branch. PRs merged here are tested in dev environment first.
- **feature/fix/*** — Work branches. Always branch from `development`, never from `main`.

**Workflow commands:**

```bash
# Create feature branch from development (NOT main)
git checkout development
git pull origin development
git checkout -b fix/description-of-change

# When ready, create PR targeting DEVELOPMENT
git push -u origin fix/description-of-change
gh pr create --base development  # NOT main!

# Trigger workflows on development branch (CRITICAL!)
gh workflow run deploy-dev.yml --ref development
```

**PR Review & Merge Process:**

1. **Open PR** → targets `development` (automatically runs `pr-check` workflow)
2. **Review** → tofu plan is posted as PR comment for infrastructure changes
3. **Test in CI** → `pr-check` validates, but full deployment testing happens after merge
4. **Merge to development** → automatically triggers `deploy-dev.yml` (deploys to dev environment)
5. **Test in dev** → smoke tests run, check health at `https://familyshield-dev.everythingcloud.ca`
6. **If dev passes** → automatically triggers `deploy-staging.yml` (deploys to staging)
7. **When ready for production** → manually create new PR: `development` → `main`
8. **Merge to main** → triggers `deploy-prod.yml` which waits for manual approval in GitHub UI

---

## Coding Standards

- **TypeScript:** strict mode, no `any`, Zod for runtime validation
- **Python:** black formatter, flake8 lint, type hints required, docstrings on all classes
- **Terraform/OpenTofu:** `tofu fmt` before commit, tflint clean, all resources tagged
- **Commits:** Conventional Commits (`feat:`, `fix:`, `iac:`, `docs:`, `chore:`)
- **PRs:** 
  - Create on feature/fix branch
  - Target `development` (NOT main)
  - Wait for user review before merging
  - After testing in dev, create separate PR: `development` → `main`
- **Secrets:** never in code, always via environment variables or GitHub Secrets
- **Tests:** new feature = new tests, no merge without tests passing

---

## Key Design Principles (never compromise)

1. **Always-On** — enforcement in cloud, not home hardware
2. **Privacy First** — content IDs extracted, not frames or message content
3. **Full Transparency** — children know monitoring is active
4. **Age-Adaptive** — 3 profiles: 6-10 (strict), 11-14 (moderate), 15-17 (guided)
5. **IaC-Driven** — everything reproducible via `tofu apply`
6. **Modular** — every component swappable without touching others

---

## Known Issues & Troubleshooting

### Cloudflare API Token — Missing Scopes

**Error:** `Authentication error (10000)` when creating Argo Tunnel or Access Applications

**Cause:** The Cloudflare API token must have ALL THREE scopes:
- Zone → DNS → Edit (for CNAME records)
- Account → Cloudflare Tunnel → Edit (for Argo Tunnel)
- Account → Access: Apps and Policies → Edit (for Zero Trust apps)

The "Edit zone DNS" template only grants the first scope — insufficient. Must use a **Custom Token** with all 3.

**Fix:** Recreate token in Cloudflare dashboard as Custom Token (see SETUP.md Part 3.3), update `CLOUDFLARE_API_TOKEN` GitHub secret, re-run workflow.

### OCI IAM — Missing Tenancy Permissions

**Error:** `404-NotAuthorizedOrNotFound` when creating compartments or identity policies

**Cause:** The GitHub Actions IAM user has no tenancy-level permissions. The bootstrap script Step 6 must create a bootstrap IAM policy before `tofu apply` can create compartments.

**Fix:** Run `bash scripts/bootstrap-oci.sh` again. It will skip existing resources and create only the missing policy. The policy uses `Allow any-user to manage all-resources in tenancy where request.user.id = '<OCID>'` syntax (NOT dynamic-group, which only works for Instance Principal auth).

### Terraform var_file Path — Working Directory Issue

**Error:** `Given variables file does not exist` during `tofu apply`

**Cause:** When `tofu apply` runs with `working_directory: iac/`, var_file paths must be relative to `iac/`, not the repo root.

**Example:**
- ❌ `var_file: iac/environments/dev/terraform.tfvars` → resolves to `iac/iac/environments/dev/` (wrong)
- ✅ `var_file: environments/dev/terraform.tfvars` → resolves to `iac/environments/dev/` (correct)

---

## How to Continue in Claude Code

When starting a new Claude Code session, just say:

> "Read CLAUDE.md and continue building FamilyShield from where we left off."

Claude Code will read this file and know exactly what's done and what's next.

For specific tasks, say things like:
- "Build `apps/api/src/types.ts` — the shared TypeScript types"
- "Scaffold the Next.js 14 portal in `apps/portal/`"
- "Build the ntfy alert dispatcher"
- "Write the user guide in `docs/user-guide/README.md`"

---

## Current Build Status

### ✅ Phase 0: Scaffold

Infrastructure, CI/CD, IaC modules, mitmproxy addon (complete with 15 tests), API skeleton with enrichers.

### ✅ Phase 1: Agents, Skills, Docs, Diagrams

Full architecture documentation, C4 model, user guide, troubleshooting, Claude Agent SDK agents, slash command skills.

### 🔄 Phase 2: Deployment & API/Portal (IN PROGRESS)

**Infrastructure & Deployment:**

- ✅ OCI IAM bootstrap policy (Step 6) created and verified
- ✅ Cloudflare API token — all 3 required scopes (DNS, Tunnel, Access)
- ✅ GitHub Actions workflows configured with AWS credentials for S3 backend
- ✅ **ARCHITECTURE CHANGE (2026-04-13):** Cloudflare resources now managed via API (separate workflow)
  - Removed Cloudflare module from IaC (`iac/main.tf`)
  - Created `deploy-cloudflare.yml` workflow (triggered after IaC succeeds)
  - Created `cleanup-cloudflare.yml` workflow (manual trigger)
  - Created `scripts/cloudflare-api.sh` helper for API operations
  - Updated all workflows to remove Cloudflare variables from IaC
  - Simplified `tofu-apply` action (no Cloudflare state conflict workarounds)
- 🔲 Deploy-dev must successfully complete one full run end-to-end (IaC → Cloudflare → App)
- 🔲 Deploy-staging and deploy-prod workflows must follow after dev passes

**Application Development:**

- ✅ API structure defined, enrichers for all 4 platforms (YouTube, Roblox, Discord, Twitch)
- ✅ mitmproxy addon complete with 15 tests
- 🔲 Portal: Next.js 14 scaffold needed (no `apps/portal/package.json` yet)
- 🔲 API: TypeScript types, Redis/Supabase client factories, alert dispatcher
- 🔲 CI/CD: Docker build workflows for api and portal images

### 📋 Phase 3: E2E Testing & Production Release

Full integration testing, security hardening, load testing, production release.

---

FamilyShield · Everythingcloudsolutions · Canada · 2026
