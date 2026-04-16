# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Last updated: 2026-04-16 (SSH security + heredoc fix + docker-compose bootstrap + jq JSON encoding)

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

**GitHub repo:** <https://github.com/Everythingcloudsolutions/FamilyShield> (private)
**Portal URL (dev):** <https://familyshield-dev.everythingcloud.ca>
**Portal URL (prod):** <https://familyshield.everythingcloud.ca>
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
bash scripts/bootstrap-oci.sh      # First-time OCI setup (11 steps) — creates compartments!
bash scripts/setup-github.sh       # Configure GitHub environments & branch protection
bash scripts/cloudflare-api.sh     # Cloudflare resource management (API-driven)
```

**CRITICAL: Always run `bootstrap-oci.sh` first!** It creates the three environment compartments (dev, staging, prod) that IaC queries and uses.

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
│   ├── portal/                  ← Next.js 14 parent portal [SCAFFOLDED]
│   ├── api/                     ← Node.js enrichment worker + Express health
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── types.ts             ← Shared TypeScript types (events, alerts, scores)
│   │   │   ├── lib/redis.ts         ← Redis singleton client factory
│   │   │   ├── lib/supabase.ts      ← Supabase singleton client factory
│   │   │   ├── alerts/dispatcher.ts ← Alert dispatcher (Phase 1 placeholder)
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
    ├── bootstrap-oci.sh         ← First-time OCI setup (11 steps)
    └── setup-github.sh          ← GitHub environments + branch protection
```

---

## High-Level Architecture

### Deployment Flow

Each environment follows the same 7-job pipeline (env = dev | staging | prod):

```
deploy-infra-{env}          IaC only (OCI VM, network, storage)
       ↓                     SSH: 0.0.0.0/0 (wide open during deploy)
build-and-push / promote-images   Docker images → GHCR
       ↓
deploy-app-{env}            SSH to VM via public IP (always works) → docker compose up
       ↓
setup-cloudflare-{env}      Cloudflare tunnel + DNS + write token to VM → restart cloudflared
       ↓
integration-tests (staging) / smoke-test (dev + prod)
       ↓
tighten-ssh-{env}           Phase A: Remove 0.0.0.0/0, add admin IP only (173.33.214.49/32)
```

**Key change (2026-04-16):** SSH deployed wide-open (0.0.0.0/0), tightened to admin IP AFTER tests pass.
- Eliminates dynamic NSG punch/seal complexity during deployment
- Guarantees SSH always works for all deployment jobs
- Security applied at the END after system is verified healthy
- No chicken-and-egg lockout risk

**Trigger by branch:**

| Branch | Workflow | Behaviour |
|---|---|---|
| `development` | `deploy-dev.yml` | Auto — runs on every push |
| `qa` | `deploy-staging.yml` | Auto — create qa from development to trigger |
| `main` | `deploy-prod.yml` | Auto — GitHub Environment `prod` requires manual approval |
| Any PR | `pr-check.yml` | Lint + `tofu plan` comment |

**Cloudflare Tunnel Token Delivery (critical pattern):**

IaC renders `docker-compose.yaml` with a placeholder `TUNNEL_TOKEN_PLACEHOLDER_{env}` because the real Cloudflare tunnel token is not known at `tofu apply` time. The `setup-cloudflare-{env}` job:
1. Creates/verifies tunnel via `scripts/cloudflare-api.sh setup {env}` (gets real token from Cloudflare API)
2. SSHes to the VM via **public IP** and writes `docker-compose.override.yaml` with the real `TUNNEL_TOKEN`
3. Restarts cloudflared — the tunnel goes from INACTIVE → ACTIVE in the Cloudflare dashboard
4. Waits up to 3 minutes for the portal URL to become reachable over HTTP

Docker Compose automatically merges `docker-compose.override.yaml` over `docker-compose.yaml`, so the override persists across `docker compose up` restarts.

**Cleanup:**

- Manual: `cleanup-cloudflare.yml` (workflow_dispatch) — removes Cloudflare resources for an environment

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
| Always Free limit | 4 OCPU / 24GB RAM total |
| Boot volume | 50GB per VM |
| OS | Ubuntu 22.04 ARM64 (dynamically queried — no hardcoding) |
| Compartments | familyshield-dev, familyshield-staging, familyshield-prod (created by bootstrap Step 7) |
| Storage bucket | Single bucket: `familyshield-tfstate` with environment prefixes (`dev/`, `staging/`, `prod/`) |
| GitHub Actions auth | OCI IAM user + API key (no OIDC — simpler for Always Free) |

### Resource Allocation Per Environment

| Environment | Sizing | Notes |
| --- | --- | --- |
| **Dev** | 1 OCPU / 6GB RAM | Always on for development |
| **Staging** | 1 OCPU / 6GB RAM | Ephemeral — spun up for QA testing, torn down after |
| **Prod** | 2 OCPU / 6GB RAM | Always on for production |
| **Total** | 4 OCPU / 18GB (baseline) + staging ephemeral | Stays within Always Free tier when staging not running |

### Critical: Bootstrap Script Steps (11 steps)

The `bootstrap-oci.sh` script must be run ONCE before any `tofu apply`:

1. **Verify OCI CLI** — check credentials configured
2. **Cloud Guard** (optional) — security monitoring setup
3. **Create GitHub Actions IAM user** — `familyshield-github-actions` (asks for email)
4. **Generate API key** — uploaded to OCI, private key → GitHub secret `OCI_PRIVATE_KEY`
5. **Create dynamic group** — matches IAM user OCID
6. **Grant bootstrap IAM policy** — grants `any-user to manage all-resources in tenancy where request.user.id = '<OCID>'` (CRITICAL for resource creation)
7. **Create environment compartments** — creates `familyshield-dev`, `familyshield-staging`, `familyshield-prod` (REQUIRED by IaC)
8. **Create Terraform state bucket** — single bucket `familyshield-tfstate` with environment-specific prefixes (`dev/`, `staging/`, `prod/`)
9. **Find Ubuntu 22.04 ARM image** — queries OCI for latest Ubuntu 22.04 ARM image compatible with VM.Standard.A1.Flex (automatic in IaC, no manual update needed)
10. **Generate SSH key** — for VS Code Remote SSH access
11. **Summary** — output all GitHub secrets to configure

**Critical Detail:** Step 6 creates a bootstrap IAM policy that allows the GitHub Actions user to manage resources in the tenancy. Step 7 creates three compartments that IaC queries for and uses. Without these, `tofu apply` will fail with 404-NotAuthorizedOrNotFound errors. Step 8 creates a single shared bucket with prefixes (Option A architecture).

**Idempotency:** The script is idempotent — re-running it will skip existing resources and only create missing ones. Safe to run multiple times.

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

**Full promotion process (4-branch + QA ephemeral):**

```
Feature/Fix Branch → PR to DEVELOPMENT → merge to development
                                              ↓
                              deploy-dev.yml (auto) → Test in dev
                                              ↓
                        Create qa branch from development
                                              ↓
                              deploy-staging.yml (auto) → Test in staging (ephemeral)
                                              ↓
                        Delete qa branch + PR development→main
                                              ↓
                              deploy-prod.yml (auto) → Test in prod (gated approval)
```

**When to use each branch:**

- **main** — Production-ready code only. Auto-deploys to prod on merge using `deploy-prod.yml`.
- **qa** — Ephemeral QA/staging environment. Created manually after dev passes, deleted after staging passes.
- **development** — Integration branch. PRs merged here auto-deploy to dev using `deploy-dev.yml`.
- **feature/fix/*** — Work branches. Always branch from `development`, never from `main`.

**Workflow commands:**

```bash
# Step 1: Create feature branch from development
git checkout development
git pull origin development
git checkout -b fix/description-of-change

# Step 2: Push and create PR to development
git push -u origin fix/description-of-change
gh pr create --base development  # NOT main!

# Step 3: Review & merge to development (auto-triggers deploy-dev.yml)
# ... review, approve, merge ...

# Step 4: After dev testing passes, create qa branch for staging
git checkout development
git pull origin development
git checkout -b qa
git push -u origin qa
# This auto-triggers deploy-staging.yml (ephemeral environment)

# Step 5: After staging testing passes, delete qa and promote to prod
git push origin --delete qa

# Step 6: Create PR from development to main
gh pr create --base main --head development
# This auto-triggers pr-check.yml for validation

# Step 7: Review & merge to main (auto-triggers deploy-prod.yml with approval gate)
# ... review, approve, merge ...
```

**Workflow Triggers:**

| Branch | Event | Workflow | Behavior |
|---|---|---|---|
| `development` | Push | `deploy-dev.yml` | Immediate deploy to dev |
| `qa` | Push | `deploy-staging.yml` | Immediate deploy to staging (ephemeral) |
| `main` | Push | `deploy-prod.yml` | Immediate deploy to prod (requires environment approval) |
| PR to dev/main | Open/Update | `pr-check.yml` | Lint, validate, plan (posted as comment) |

**Approval Gates:**

- **Dev → Staging:** Automatic after `deploy-dev.yml` passes (no manual approval needed)
- **Staging → Prod:** Manual user approval via GitHub UI before merging PR to main
- **Production Deployment:** Requires GitHub Environment `prod` approval (configured in repo settings)

**PR Review & Merge Process:**

1. Create feature branch and PR targeting `development` → `pr-check` runs automatically
2. Review PR, check `tofu plan` comment and test results
3. Merge to `development` → `deploy-dev.yml` triggers automatically
4. Monitor dev deployment at `https://familyshield-dev.everythingcloud.ca`
5. Once dev passes: create `qa` branch from `development` → `deploy-staging.yml` triggers
6. Monitor staging deployment at `https://familyshield-staging.everythingcloud.ca`
7. After staging passes: delete `qa` branch and create PR `development` → `main`
8. Review final PR, check `tofu plan` for prod infrastructure changes
9. Merge to `main` → `deploy-prod.yml` triggers with approval gate in GitHub UI


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

### SSH Security — Deploy-First, Secure-Last (2026-04-16)

**Why SSH deployed wide-open, then tightened?**

Earlier approach tried dynamic NSG punch/seal: open SSH for runner, deploy, seal after. This failed with `oci network nsg-rules add` exit code 2 (OCI CLI error during rule creation).

**New approach (current):**

1. Deploy with `admin_ssh_cidrs = ["0.0.0.0/0"]` — SSH open to world during deploy
2. All jobs (infra, build, deploy-app, setup-cloudflare, smoke-test) always succeed
3. **tighten-ssh-{env}** job runs at END (after smoke tests pass):
   - Queries NSG for all 0.0.0.0/0 SSH rules
   - Removes them
   - Adds single restricted rule: 173.33.214.49/32 (admin IP only)

**Benefits:**

- No OCI CLI errors during deployment
- SSH always available when needed
- Security applied after system verified healthy
- Cleaner, simpler architecture

**Phase B (tunnel SSH)** still runs at the END after tunnel is confirmed active, providing additional access path.

### SSH Action Broken — appleboy/ssh-action Replaced with Native SSH (2026-04-16)

**Problem:** `appleboy/ssh-action@v1` was failing with `no configuration file provided: not found` from drone-ssh.

**Root cause:** The action's drone-ssh binary cannot properly parse multiline SSH keys passed via GitHub Actions outputs. The issue is with the action itself, not the key format.

**Solution:** Replaced `appleboy/ssh-action@v1` with native SSH command:
- Write SSH key to file with carriage returns stripped
- Use native `ssh -i ~/.ssh/familyshield` with heredoc for deployment script
- No external action dependency — simpler and more reliable

All three workflows (`deploy-{dev,staging,prod}.yml`) now use native SSH instead of the problematic action.

### Heredoc Variable Expansion — Single-Quoted Heredocs Prevent Variable Interpolation (2026-04-16)

**Problem:** SSH deployment steps failed with `bash: line 8: GHCR_TOKEN: unbound variable` when trying to authenticate with GHCR.

**Root cause:** Single-quoted heredocs (`<<'ENDSSH'`) prevent variable expansion on the local shell. Environment variables like `$GHCR_TOKEN` and `$GHCR_USER` arrived at the remote shell as literal strings (`$GHCR_TOKEN`) instead of their values, causing docker login to fail.

**Solution:** Changed heredoc delimiters from `<<'ENDSSH'` (single-quoted) to `<<ENDSSH` (unquoted). This allows the local shell to expand variables before sending the script to the remote shell.

**Fixed in:**

- `deploy-dev.yml` line 224: deploy-app-dev step
- `deploy-prod.yml` line 197: deploy-app-prod step
- `deploy-staging.yml`: Already correct (no change needed)

**Pattern:** When using heredocs in GitHub Actions with SSH for remote script execution, use unquoted heredoc delimiters (`<<EOF`) if the remote script needs variable interpolation. The variables expand locally before SSH transmission, ensuring they're available on the remote shell.

### docker-compose.yml Missing on Fresh VM — Bootstrap Before Deploy (2026-04-16)

**Problem:** SSH deployment step failed with `no configuration file provided: not found` when trying to run `docker compose` commands on a fresh VM.

**Root cause:** The `deploy-app-{env}` jobs tried to use docker-compose before the VM had `docker-compose.yml`. The file is created by IaC's cloud-init on first boot, but cloud-init may not have completed by the time deploy-app runs. Additionally, cloud-init's template rendering may fail silently, leaving the file unrendered.

**Solution:** Added "Bootstrap VM — copy docker-compose.yml if missing" step to each `deploy-app-{env}` job that:

1. SSHes to the VM and checks if `/opt/familyshield/docker-compose.yml` exists
2. If missing, renders the Terraform template locally with environment-specific variables (`SUPABASE_URL`, `GROQ_API_KEY`, etc.)
3. Copies the rendered file to the VM via `scp`
4. Returns immediately if file already exists (idempotent)

**Fixed in:**

- `deploy-dev.yml`: Added bootstrap step
- `deploy-staging.yml`: Added bootstrap step
- `deploy-prod.yml`: Added bootstrap step

**Pattern:** Always bootstrap required files before using them in deployment scripts, especially when cloud-init timing is uncertain on fresh VMs. This is particularly important for:

- Configuration files (docker-compose.yml, env files)
- Application directories that may not exist yet
- Any file created during first-boot cloud-init that later deployment steps depend on

The bootstrap pattern (check → render → copy) is idempotent and safe to run multiple times.

### Cloudflare API JSON Encoding — Control Characters Break Payload (2026-04-16)

**Problem:** Cloudflare API rejected tunnel creation with error: `Could not parse input. Json deserialize error: control character (\u0000-\u001F) found while parsing a string at line 4 column 0`

**Root cause — Part 1 (JSON construction):** JSON payloads were being constructed using bash string concatenation and command substitution (`cat <<EOF` with `$(...)` expansions). When variables like `tunnel_secret` contain special characters or when command substitution produces unexpected output, the resulting JSON becomes malformed with unprintable control characters that Cloudflare's parser rejects.

**Root cause — Part 2 (Whitespace in outputs):** When `tunnel_secret` is extracted from GitHub Actions workflow outputs (via `${{ steps.iac.outputs.tunnel_secret }}`), it may include trailing whitespace like carriage returns or newlines. These are control characters that break JSON when the value is embedded without proper escaping. The SSH logic update may have changed how GitHub Actions handles outputs, introducing carriage returns similar to the SSH key issue.

**Solution — Part 1:** Replaced all JSON payload construction in `scripts/cloudflare-api.sh` with `jq -n` + `--arg` / `--argjson` flags. This ensures:

- All variables are safely escaped as JSON values
- Special characters don't corrupt the payload
- JSON is guaranteed to be valid before transmission

**Solution — Part 2:** Added defensive whitespace trimming in `create_tunnel()` and `setup_cloudflare()` functions:

```bash
# Strip leading/trailing whitespace (handles carriage returns, newlines, etc.)
tunnel_secret=$(echo "$tunnel_secret" | tr -d '[:space:]')
```

This prevents control characters from GitHub Actions workflow outputs from breaking the JSON payload.

**Fixed in:**

- `scripts/cloudflare-api.sh` line 89-95: `create_tunnel()` now uses `jq -n --arg` + whitespace trimming
- `scripts/cloudflare-api.sh` setup_cloudflare() function: Added parameter normalization and validation
- `scripts/cloudflare-api.sh` line 258-268: `create_dns_record()` now uses `jq -n --arg --argjson`
- `scripts/cloudflare-api.sh` line 318-327: `create_access_application()` now uses `jq -n --arg`
- `scripts/cloudflare-api.sh` line 354-363: `create_ssh_access_app()` now uses `jq -n --arg`

**Pattern:** Never construct JSON via string concatenation. Always use `jq -n` with variable arguments:

```bash
# ❌ Wrong — unsafe, breaks on special characters
local payload=$(cat <<EOF
{"name": "$name", "value": "$value"}
EOF
)

# ✅ Right — safe, handles any special characters
local payload=$(jq -n \
  --arg name "$name" \
  --arg value "$value" \
  '{name: $name, value: $value}')
```

Use `--argjson` for boolean/numeric values, `--arg` for strings.

### SSH Key Carriage Returns — appleboy/ssh-action Failure (2026-04-16 — OBSOLETE)

**Problem:** `appleboy/ssh-action@v1` was failing with `no configuration file provided: not found` from drone-ssh.

**Root cause:** GitHub Secrets containing SSH private keys may include carriage returns (`\r`) from Windows line endings. These corrupt the PEM key format that drone-ssh expects.

**Solution:** Added explicit step before each SSH action to sanitize the key:

```bash
SSH_KEY_CLEAN=$(echo "$SSH_KEY" | tr -d '\r')
```

All three workflows (`deploy-{dev,staging,prod}.yml`) now include "Prepare SSH key" step that removes carriage returns before passing to appleboy/ssh-action.

### Cloudflare Tunnel Stays INACTIVE After Setup (historical — fixed 2026-04-15)

**Root cause chain:** IaC renders `docker-compose.yaml` with `TUNNEL_TOKEN=TUNNEL_TOKEN_PLACEHOLDER_{env}` because the real token is unknown at `tofu apply` time. If cloudflared were started via `docker compose`, it would use the placeholder and fail to authenticate.

**Fix (current architecture):** cloudflared is started via `docker run --network host --token $TUNNEL_TOKEN` in the `setup-cloudflare-{env}` job. The `--token` flag downloads ingress configuration from Cloudflare's control plane — no local config file or docker-compose.yml needed. If tunnel is still INACTIVE after a deploy, check:

```bash
ssh ubuntu@<vm-ip> "docker logs familyshield-cloudflared --tail 20"
# Healthy: "Registered tunnel connection connIndex=0"
# Bad token: re-run the setup-cloudflare workflow job
```

Full details in `docs/troubleshooting/infrastructure.md` — Issues 3, 4, and 8.

### cloudflare-api.sh Output Pollution (historical — fixed 2026-04-15)

**Symptom:** `Failed to get tunnel token` + `Invalid format '─────...'` in `$GITHUB_OUTPUT`

**Root cause:** `header()`, `info()`, `success()` functions printed to stdout. Command substitutions like `tunnel_id=$(create_tunnel ...)` captured separator lines alongside the UUID, corrupting the API URL.

**Fix:** All diagnostic output functions redirected to `>&2`. Also split `local var=$(cmd)` into separate `local var` + `var=$(cmd)` lines so `set -e` correctly aborts on failure.

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
- ✅ **ARCHITECTURE CHANGE (2026-04-14):** IaC module sequencing & compartment query logic
  - Bootstrap script Step 7 now creates three compartments: `familyshield-dev`, `familyshield-staging`, `familyshield-prod`
  - IaC compartments module changed from creation to data source queries (no duplicate compartments)
  - Re-enabled compartments module in main.tf with proper dependency order
  - Updated compute module to accept environment-specific sizing via tfvars
  - Resource allocation: Dev (1C/6GB) + Staging ephemeral (1C/6GB) + Prod (2C/6GB) = within 4C/24GB Always Free
  - Per-environment state buckets: `familyshield-tfstate-{environment}`
  - Bucket import logic handles existing resources without 409 conflicts
- ✅ **Deployment pipeline stabilised (2026-04-15):** All three workflows (dev/staging/prod) now follow the same 6-job pattern with all pipeline blockers resolved:
  - `cloudflare-api.sh` output pollution (diagnostic functions to stdout) — fixed: all diagnostics redirect to `>&2`; `local var=$(cmd)` split into two statements
  - Tunnel token never written to VM — fixed: cloudflared now starts via `docker run --network host --token` (zero docker-compose.yml dependency)
  - SSH key `printf` missing trailing newline → `libcrypto` error — fixed: `echo "$KEY" | tr -d '\r'` in all three workflows
  - Concurrent runs causing Terraform state lock conflicts — fixed: `concurrency:` groups on all three workflows (`cancel-in-progress: true` dev/staging, `false` prod)
  - Race condition on new VM boot: deploy-app runs before cloud-init finishes writing docker-compose.yml — fixed: `sudo cloud-init status --wait || true` added to all deploy-app scripts
  - `deploy-staging.yml` gate job broken `if:` condition (`workflow_run.conclusion` on a `push` trigger is always null) — fixed: gate job removed; staging triggers on `qa` branch push
  - docker-compose.yml missing on VM (broken cloud-init) → api/portal not running → cloudflared returns 502 → smoke test fails — fixed: "Bootstrap VM" step in all setup-cloudflare jobs
  - All 8 issues with root causes, investigation steps, and fixes documented in `docs/troubleshooting/infrastructure.md`
- ✅ **SSH security redesigned (2026-04-16):** Deploy-first, secure-last approach replaces failed dynamic punch/seal
  - Removed dynamic NSG punch/seal logic (was failing with OCI CLI exit code 2)
  - Deploy with `admin_ssh_cidrs = ["0.0.0.0/0"]` — SSH open to world during all deployment jobs
  - Added `tighten-ssh-{env}` job at end of pipeline (runs after smoke-test passes)
  - tighten-ssh removes 0.0.0.0/0 rules and adds admin IP only (173.33.214.49/32)
  - Phase B (tunnel SSH) unchanged — added at end after tunnel verified active
  - Eliminates chicken-and-egg lockout risk, guarantees SSH always works during deploy
- 🔲 First full end-to-end successful dev pipeline run (all 7 jobs green: infra → build → deploy-app → setup-cloudflare → smoke-test → tighten-ssh)
- 🔲 Deploy-staging and deploy-prod workflows must follow after dev passes (staging ephemeral teardown documented)

**Application Development:**

- ✅ API structure defined, enrichers for all 4 platforms (YouTube, Roblox, Discord, Twitch) — fully implemented
- ✅ mitmproxy addon complete with 15 tests
- ✅ Portal: Next.js 14 fully built (`apps/portal/`)
  - Pages: dashboard (server-side), /devices (client-side), /alerts (server-side + client filter)
  - Components: NavBar, RiskBadge, DeviceCard, AlertFeed (Supabase Realtime), AlertTable (filter + sort)
  - lib/supabase.ts (browser singleton), lib/types.ts (portal-specific types)
  - Playwright E2E tests: `tests/e2e/` — dashboard (7 tests), alerts (8 tests), devices (9 tests)
  - playwright.config.ts — Chromium + Firefox + Mobile Chrome, CI-aware retry/workers
- ✅ API: types.ts extended (age_restricted, mature_flag, description, channel_name, player_count, viewer_count)
- ✅ API: alerts/dispatcher.ts complete — ntfy push + Supabase INSERT + Redis 5-min dedup
- ✅ API: jest.config.js + full test suite (6 test files: youtube, roblox, discord, twitch enrichers + dispatcher + LLM router)
- 🔲 Deploy-dev must successfully complete one full run end-to-end (IaC → Cloudflare → App)
- 🔲 Deploy-staging and deploy-prod workflows must follow after dev passes (staging ephemeral teardown documented)
- 🔲 Docker build workflows for api and portal images (build-and-push matrix job missing)
- 🔲 Supabase tables must be created: `content_events`, `alerts`, `devices` (schema migration needed)

### 📋 Phase 3: E2E Testing & Production Release

Full integration testing, security hardening, load testing, production release.

---

FamilyShield · Everythingcloudsolutions · Canada · 2026
