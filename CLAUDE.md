# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Last updated: 2026-04-24 (Full codebase + workflow review: fixed OCI auth claim, service count, added complete GitHub Secrets table, VM filesystem layout, service network IPs, accurate workflow job descriptions, prod image promotion model. Removed .env.example table — secrets live in GitHub Secrets only.)

## Active Development Anchor

**Primary planning document:** [`docs/mvp-plan.md`](docs/mvp-plan.md)

This file defines the MVP feature list (F-01 to F-29), post-MVP backlog (F-30+), and phase-by-phase todo checklists. **Always check `docs/mvp-plan.md` first when picking up a new task.** Update it when items are completed.

**Current phase:** Phase 2a — Critical infrastructure gaps (1 of 4 items remaining)
**Current milestone:** Fix AdGuard upstream DNS (2a.1, manual step) → enrol iPhone/iPad/MacBook → real traffic through pipeline.

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

### Cloudflare IaC

Cloudflare resources (tunnel, DNS records, Access apps, WAF) are managed via a **separate OpenTofu root** at `iac/cloudflare/`, not the main OCI IaC. Deployed by `setup-cloudflare-dev` job inside `infra-dev.yml`.

Manual cleanup only (rare — use when tearing down an environment):

```bash
export CLOUDFLARE_API_TOKEN="..."
export CLOUDFLARE_ACCOUNT_ID="..."
export CLOUDFLARE_ZONE_ID="..."
bash scripts/cloudflare-api.sh cleanup dev
```

**Why a separate root?** Cloudflare state is independent of OCI state. Keeps IaC fast and avoids provider conflicts. The `infra-dev.yml` workflow sequences OCI apply → Cloudflare apply → tunnel start automatically.

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

**Portal (Next.js 16):**

```bash
cd apps/portal
npm install
npm run dev                              # Dev server on http://localhost:3000
npm run build                            # Build for production
npm run lint                             # Run ESLint
npm run type-check                       # TypeScript type checking

# E2E Testing (Playwright)
npm run test:e2e                         # Run all E2E tests (Chromium, Firefox, Mobile Chrome)
npm run test:e2e -- --project chromium  # Run only Chromium tests
npm run test:e2e -- --debug              # Run with headed browser (interactive)
npm run test:e2e:ui                      # Run with Playwright UI (shows test interaction)
npm run test:e2e:report                  # Show HTML test report
npm run test:e2e -- tests/e2e/dashboard.spec.ts  # Run single test file
```

**Requirements:**

- API running locally: `cd apps/api && npm run dev` (portal calls localhost:3001/health)
- Supabase configured: `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Port 3000 available (dev server)


**Test environment:**

- `qa-e2e.yml` — manual trigger (`workflow_dispatch`) only. Runs against live dev URL or staging.
- All workflow schedules (`cron:`) have been removed — every workflow is now manual or path-triggered only.

---

## Portal Development — Critical Patterns

### Next.js 16: Async `searchParams` in Server Components

**Pattern:** In Next.js 16, `searchParams` is a `Promise` and must be `await`-ed.

```tsx
// ❌ Wrong — searchParams is a Promise
export default function Page({ searchParams }) {
  const device = searchParams.device  // Runtime error!
}

// ✅ Right — await the Promise first
export default async function Page({ searchParams }: {
  searchParams: Promise<{ device?: string }>
}) {
  const resolved = await searchParams
  const device = resolved.device  // ✅ works
}
```

**Why this matters:** Forgetting to `await` crashes the page at runtime. This is a breaking change in Next.js 16.

### Portal Data Fetching: Server vs Client-Side

**Critical insight:** Playwright's `page.route()` intercepts **browser HTTP requests only**, not SSR fetches.

**Pattern: Use client-side fetching for components whose test data needs mocking**

```tsx
// ❌ Server-side fetch (bypasses Playwright mocks) — DON'T use for testable data
export default async function AlertsPage() {
  const { data } = await supabase.from('alerts').select('*')
  return <AlertTable initialAlerts={data} />
}

// ✅ Client-side fetch (Playwright can mock via page.route) — USE this
'use client'
export function AlertTable() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  
  useEffect(() => {
    getSupabase()
      .from('alerts')
      .select('*')
      .then(({ data }) => setAlerts(data ?? []))
  }, [])
  
  // Playwright mocks intercept this fetch
}
```

**When to use each:**
- **Server-side (RSC):** Static data, SEO-critical content, secrets that can't reach browser
- **Client-side (useEffect):** Data that tests need to mock, real-time updates, user-dependent content

**Example from codebase:**
- `apps/portal/app/alerts/page.tsx` — minimal server component, reads `searchParams` only, delegates fetch to `<AlertTable>`
- `apps/portal/components/AlertTable.tsx` — client component, fetches via `useEffect`, Playwright can mock the request

### Supabase RLS Policies in Portal

All three tables have **anon access** for MVP (replaced by F-14 auth before production):

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `devices` | ✅ anon | ✅ anon | ❌ | ❌ |
| `content_events` | ✅ anon | ❌ | ❌ | ❌ |
| `alerts` | ✅ anon | ❌ | ❌ | ❌ |

**Before production:** Replace anon policies with Supabase Auth (`auth.uid() = parent_user_id`).

### Playwright E2E Testing Patterns

**Mocking Supabase responses:**

```typescript
test.beforeEach(async ({ page }) => {
  // Intercept browser-side REST calls only
  await page.route('**/rest/v1/alerts*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ALERTS),
    })
  })
})
```

**Common test patterns:**

```typescript
// Wait for element with specific test ID
await expect(page.getByTestId('alert-row')).toHaveCount(4)

// Click element by test ID
await page.getByTestId('filter-risk').click()

// Check class presence (e.g. active nav link)
await expect(page.getByTestId('nav-link-dashboard'))
  .toHaveClass(/text-accent-400/)  // Use regex for partial match

// Modal backdrop click (click relative to element, not viewport)
await page.getByTestId('enroll-modal').click({ position: { x: 5, y: 5 } })
```

**What NOT to mock:**
- Don't mock server-side fetches (RSC data) — they bypass `page.route()`
- If component fetches server-side, move fetch to client-side first

**Demo mode:** `isDemoMode()` returns true only when `!isSupabaseConfigured()`. In CI (where Supabase is configured), demo mode never activates. Use Playwright mocks instead.

### Portal `lib/` Utilities

Key shared modules in `apps/portal/lib/`:

- `supabase.ts` — `getSupabase()` singleton client factory; call this in `useEffect` hooks, never at module top-level
- `types.ts` — shared TypeScript types for `Device`, `Alert`, `ContentEvent`
- `demo-data.ts` — `isDemoMode()` / `isSupabaseConfigured()` checks; fake data returned when Supabase env vars are absent (local dev without `.env.local`)
- `useTheme.ts` — theme hook for dark/light mode

**Pattern:** Components call `getSupabase()` from `lib/supabase.ts` rather than importing the Supabase client directly — keeps the singleton lazy and testable.

**Local Docker builds (before pushing to GHCR):**

```bash
# API Docker image (arm64)
cd apps/api
docker build --platform linux/arm64 -t familyshield-api:dev .
docker run --env-file .env.docker familyshield-api:dev npm run dev

# Portal Docker image (static Next.js)
cd apps/portal
docker build -t familyshield-portal:dev .
docker run -p 3000:3000 familyshield-portal:dev
```

**Supabase schema setup:**

```bash
# Create tables in Supabase (one-time per environment)
# Tables: content_events, alerts, devices, alert_rules, users
# Run migrations via Supabase Studio or SQL editor
# Enable RLS on all tables before deploying to production
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
| CI/CD | GitHub Actions | OCI API key auth (user OCID + private key in GitHub Secrets) |
| Frontend | Next.js 16 on Cloudflare Pages | Free hosting, unlimited bandwidth |
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
│   ├── actions/                 ← Reusable: oci-login, tofu-plan, tofu-apply, tofu-import-existing
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
│       └── docker-compose.yaml.tpl ← 12 services (cloudflared runs standalone, not in compose)
├── apps/
│   ├── portal/                  ← Next.js 16 parent portal [SCAFFOLDED]
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

**Split pipeline architecture:** IaC and app deployment are separate workflows, triggered by different path changes.

#### Infra workflows (triggered by `iac/**` changes)

```
infra-dev.yml (development branch):
  1. deploy-infra-dev    — verify bootstrap → tofu apply (iac/)
                           Retries up to 4h/15-min if "Out of host capacity"
  2. setup-cloudflare-dev — tofu apply (iac/cloudflare/) → tunnel_token output
                            gh secret set CF_ACCESS_CLIENT_ID/SECRET (needs GH_PAT)
                            SSH via PUBLIC IP → write docker-compose.yml (sed from template)
                            SSH: cloud-init --wait → mount data volume → start infra services
                            docker run --network host --token $TUNNEL_TOKEN (cloudflared)
  3. smoke-infra-dev     — SSH: check docker logs for "Registered tunnel connection"
  4. tighten-ssh-dev     — tofu apply with TF_VAR_admin_ssh_cidrs=["173.33.214.49/32"]

infra-prod.yml (main branch) — identical jobs with safety-check gate + plan step + create-release
```

```
deploy-dev.yml (development branch):
  1. wait-for-infra  — polls GitHub API; waits ≤10 min for infra-dev on same SHA
  2. verify-tunnel   — SSH via CF tunnel to confirm reachability
  3. build-and-push  — matrix (api, portal, mitm) → linux/arm64 → GHCR
                       Portal build-args: NEXT_PUBLIC_SUPABASE_URL + ANON_KEY baked in
                       Tags: familyshield-{app}:dev, familyshield-{app}:$SHA
  4. deploy-app-dev  — SSH via CF tunnel: ssh-dev.everythingcloud.ca
                       tar pipe (not scp) to sync apps/mitm + apps/platform-config
                       Write /opt/familyshield/.env (YOUTUBE/DISCORD/TWITCH keys)
                       docker compose pull api portal mitmproxy → up -d
  5. smoke-test      — HTTP portal (:200/302/403) + API /health

deploy-prod.yml (main branch) — DOES NOT rebuild images:
  1. safety-check    — workflow_dispatch requires confirm="DEPLOY"
  2. wait-for-infra  — same pattern as dev
  3. verify-tunnel   — HTTP check on prod portal URL
  4. promote-images  — pulls :$SHA (or :dev) → tags :prod + :latest → pushes (api + portal only)
  5. deploy-app-prod — SSH via CF tunnel: ssh.everythingcloud.ca
                       docker compose pull api portal → up -d --no-deps
  6. smoke-test
  7. create-release

deploy-staging.yml (qa branch) — combined infra+app, fully ephemeral:
  1. deploy-infra-staging  — tofu apply
  2. promote-images        — dev → staging tags (api + portal)
  3. deploy-app-staging    — SSH via PUBLIC IP (staging has no pre-existing CF tunnel)
  4. setup-cloudflare-staging — uses cloudflare-api.sh (not tofu); starts cloudflared
  5. integration-tests     — Playwright E2E (Chromium only)
  6. smoke-test
  7. tighten-ssh-staging
  8. auto-teardown (if: always) — stop containers → cf cleanup → tofu destroy → delete qa branch
```

**Workflow trigger matrix:**

| Workflow | Trigger | Notes |
|---|---|---|
| `infra-dev.yml` | push `iac/**` on `development`, `workflow_dispatch` | |
| `deploy-dev.yml` | push `apps/**`/`scripts/**` on `development`, `workflow_dispatch`, `workflow_run` after infra-dev | |
| `infra-prod.yml` | push `iac/**` on `main`, `workflow_dispatch` | confirm="DEPLOY" for manual |
| `deploy-prod.yml` | push `apps/**`/`scripts/**` on `main`, `workflow_dispatch`, `workflow_run` after infra-prod | confirm="DEPLOY" for manual |
| `deploy-staging.yml` | push any on `qa`, `workflow_dispatch` | Full ephemeral lifecycle |
| `pr-check.yml` | PR to `development` or `main` | lint-iac + lint-apps + plan + security |
| `security-scan.yml` | PR + push `apps/**`/`iac/**`/`scripts/**` on dev/main, `workflow_dispatch` | Posts scan summary as PR comment |
| `auto-fix-vulnerabilities.yml` | `workflow_dispatch` | npm audit fix + pip-audit fix + PR |
| `e2e.yml` | `workflow_dispatch` | Playwright — local/dev/prod target |
| `deploy-platform-services.yml` | `workflow_dispatch` | Starts infra services only (no api/portal) |
| `check-health-internal.yml` | `workflow_dispatch` | Redis + InfluxDB health via CF tunnel SSH |
| `teardown-dev.yml` | `workflow_dispatch` (confirm="dev") | Full destroy: containers + CF + OCI |
| `teardown-prod.yml` | `workflow_dispatch` | Same pattern for prod |
| `teardown-staging.yml` | `workflow_dispatch` | Manual teardown if auto-teardown failed |
| `cleanup-state.yml` / `cleanup-tfstate.yml` | `workflow_dispatch` | State maintenance |
| `qa-e2e.yml` / `scheduled-health-check.yml` | `workflow_dispatch` | Schedules removed |

**SSH model:**
- **Infra workflows:** Public IP during bootstrap; `tighten-ssh` re-runs `tofu apply` with `TF_VAR_admin_ssh_cidrs=["173.33.214.49/32"]` to lock down (admin IP only). To re-run infra on an already-tightened VM, manually open NSG in OCI Console first.
- **App workflows (dev/prod):** CF Tunnel SSH exclusively — `ssh-dev.everythingcloud.ca` / `ssh.everythingcloud.ca`. Credentials passed as explicit flags: `--service-token-id $CF_ACCESS_CLIENT_ID --service-token-secret $CF_ACCESS_CLIENT_SECRET` (env vars do not work with cloudflared).
- **Staging:** Public IP for app deploy; OCI CLI NSG commands for SSH tighten.

**Cloudflare Tunnel Token Delivery (critical pattern):**

`docker-compose.yaml.tpl` uses placeholder `TUNNEL_TOKEN_PLACEHOLDER_{env}`. The `setup-cloudflare-{env}` job:
1. Runs `tofu apply iac/cloudflare/` → captures `tunnel_token` output
2. Updates `CF_ACCESS_CLIENT_ID/SECRET` in GitHub Secrets via `gh secret set` (requires `GH_PAT`)
3. SSHes to VM via public IP → writes `docker-compose.yml` rendered from template
4. Starts cloudflared: `docker run --network host --restart unless-stopped --token $TUNNEL_TOKEN`

### Service Architecture

All backend services run on a single OCI Always Free ARM VM (4 OCPU / 24GB RAM) in `ca-toronto-1`. Services communicate via:

- **Redis** (port 6379) — event queue between mitmproxy and API
- **Supabase** — PostgreSQL + Realtime WebSocket
- **Shared volumes** — config files mounted at /etc/familyshield/

**Docker network:** `172.20.0.0/24` bridge. Each service has a static IP.

| Service | Container IP | Host Port(s) | Notes |
|---|---|---|---|
| AdGuard Home | 172.20.0.2 | 53/tcp+udp, 3080, 853 | DNS filtering; first-run wizard on :3000 |
| Headscale | 172.20.0.3 | 8080, 9090 | VPN control plane |
| mitmproxy | 172.20.0.4 | 8888 (web UI), 8889 (transparent) | iptables redirects 443→8889, 80→8888 |
| Redis | 172.20.0.5 | 6379 | Event queue; 512MB maxmemory |
| API Worker | 172.20.0.6 | 3001 | `/health`, `/metrics`, `/cert` |
| Node-RED | 172.20.0.7 | 1880 | Automation flows |
| InfluxDB | 172.20.0.8 | 8086 | Time-series metrics; 30d retention |
| Grafana | 172.20.0.9 | 3002 | Dashboards; uid 472 owns data dir |
| ntfy | 172.20.0.10 | 2586 | Push notifications; deny-all default |
| Caddy | 172.20.0.11 | 443/tcp+udp | HTTPS reverse proxy → Headscale :8080 |
| Portal | 172.20.0.12 | 3000 | Next.js parent UI |
| Portainer | 172.20.0.13 | 9000 | Docker management UI |
| Headscale Admin | 172.20.0.14 | 3100 | VPN admin web UI |
| **cloudflared** | host network | — | **NOT in docker-compose** — runs standalone via `docker run --restart unless-stopped --token $TOKEN` |

**VM filesystem layout:**

```
/opt/familyshield/              ← App directory (boot volume)
  docker-compose.yml            ← Rendered from iac/templates/docker-compose.yaml.tpl by workflow
  .env                          ← YOUTUBE_API_KEY, DISCORD_BOT_TOKEN, TWITCH_* (written by deploy workflow)
  apps/
    mitm/                       ← mitmproxy addon + requirements (synced by deploy workflow)
    platform-config/            ← headscale.yaml, ntfy config, grafana provisioning

/opt/familyshield-data/         ← OCI persistent block volume (/dev/oracleoci/oraclevdb)
  adguard/{work,conf}/          ← AdGuard config + databases (survive VM recreation)
  headscale/                    ← Headscale state + node keys
  mitmproxy/                    ← mitmproxy-ca-cert.pem lives here (served via /cert endpoint)
  redis/                        ← Redis persistence (appendonly)
  influxdb/                     ← InfluxDB data
  grafana/                      ← Grafana dashboards + config (uid 472)
  ntfy/{cache,data}/
  portainer/
```

**Key data note:** The persistent block volume at `/opt/familyshield-data` survives `tofu destroy` + `tofu apply` cycles (VM recreation). AdGuard config, Headscale node keys, and mitmproxy CA cert are preserved. Do NOT store stateful data in Docker named volumes — those live on the boot volume and are wiped on VM recreation.

### Data Flow

1. **Device** connects via AdGuard + mitmproxy for DNS/HTTPS inspection
2. **mitmproxy** extracts content IDs (video_id, game_place_id, etc.) → Redis queue
3. **API worker** polls Redis → calls platform APIs (YouTube, Roblox, etc.) → AI risk scoring (Groq → Anthropic fallback)
4. **Results** stored in Supabase → **Portal** displays in real-time via WebSocket

---

## GitHub Secrets

All secrets live in the GitHub repo under Settings → Secrets and Variables → Actions. The `oci-login` action and workflows consume them directly — **nothing is stored in `.env` files in the repo.**

**OCI authentication** (API key auth — not OIDC):

| Secret | Used By |
|---|---|
| `OCI_TENANCY_OCID` | All infra workflows |
| `OCI_USER_OCID` | `oci-login` action |
| `OCI_FINGERPRINT` | `oci-login` action |
| `OCI_PRIVATE_KEY` | `oci-login` action (PEM key for OCI API) |
| `OCI_SSH_PRIVATE_KEY` | SSH to VM (infra + app workflows) |
| `OCI_SSH_PUBLIC_KEY` | `TF_VAR_ssh_public_key` — cloud-init adds it to VM |
| `OCI_NAMESPACE` | S3-compatible backend endpoint URL |
| `AWS_ACCESS_KEY_ID` | OCI Object Storage S3-compat (Terraform state backend) |
| `AWS_SECRET_ACCESS_KEY` | OCI Object Storage S3-compat (Terraform state backend) |

**OCI state backend note:** OpenTofu uses the S3-compatible endpoint of OCI Object Storage. `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` are OCI Customer Secret Keys (not AWS keys) — they authenticate the S3-compatible API calls.

**Cloudflare:**

| Secret | Used By | Notes |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare IaC root, `cloudflare-api.sh` | 5 scopes required |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare IaC root, scripts | |
| `CLOUDFLARE_ZONE_ID` | Cloudflare IaC root, scripts | |
| `CF_ACCESS_CLIENT_ID` | `deploy-dev.yml` tunnel SSH | Auto-updated by `infra-dev.yml` after each Cloudflare IaC run |
| `CF_ACCESS_CLIENT_SECRET` | `deploy-dev.yml` tunnel SSH | Auto-updated by `infra-dev.yml` |
| `CF_ACCESS_CLIENT_ID_STAGING` | `deploy-staging.yml` smoke test | |
| `CF_ACCESS_CLIENT_SECRET_STAGING` | `deploy-staging.yml` smoke test | |
| `CF_ACCESS_CLIENT_ID_PROD` | `deploy-prod.yml` smoke test | |
| `CF_ACCESS_CLIENT_SECRET_PROD` | `deploy-prod.yml` smoke test | |
| `GH_PAT` | `infra-dev/prod.yml` — updates CF secrets via `gh secret set` | Personal Access Token |

**Supabase (per-environment):**

| Secret | Dev | Staging | Prod |
|---|---|---|---|
| URL | `SUPABASE_URL` | `SUPABASE_URL_STAGING` | `SUPABASE_URL_PROD` |
| Anon key | `SUPABASE_ANON_KEY` | `SUPABASE_ANON_KEY_STAGING` | `SUPABASE_ANON_KEY_PROD` |
| Service role key | `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY_STAGING` | `SUPABASE_SERVICE_ROLE_KEY_PROD` |

**Note:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are **baked into the Portal Docker image at build time** via `--build-arg`, mapped from `secrets.SUPABASE_URL` / `secrets.SUPABASE_ANON_KEY`. They are not runtime env vars.

**LLM + Platform APIs (shared across environments):**

| Secret | Used By | Current Status |
|---|---|---|
| `GROQ_API_KEY` | API `llm/router.ts` | ✅ Set |
| `ANTHROPIC_API_KEY` | API fallback LLM | ✅ Set |
| `YOUTUBE_API_KEY` | API YouTube enricher | ✅ Set |
| `DISCORD_BOT_TOKEN` | API Discord enricher | 🔲 Missing |
| `TWITCH_CLIENT_ID` | API Twitch enricher | 🔲 Missing (Parked) |
| `TWITCH_CLIENT_SECRET` | API Twitch enricher | 🔲 Missing (Parked) |

**Infrastructure secrets:**

| Secret | Used By |
|---|---|
| `ADGUARD_ADMIN_PASSWORD` | dev/staging docker-compose env |
| `ADGUARD_ADMIN_PASSWORD_PROD` | prod docker-compose env |
| `INFLUXDB_PASSWORD` | docker-compose InfluxDB init |
| `TF_VAR_INFLUXDB_ADMIN_TOKEN` | docker-compose InfluxDB + Grafana |
| `GRAFANA_PASSWORD` | docker-compose Grafana admin |

**Testing:**

| Secret | Used By |
|---|---|
| `TEST_PARENT_EMAIL` | Playwright E2E tests in `deploy-staging.yml` |
| `TEST_PARENT_PASSWORD` | Playwright E2E tests in `deploy-staging.yml` |

**How secrets reach the VM:** Most secrets are injected into `docker-compose.yml` via `sed` substitution on the template (`iac/templates/docker-compose.yaml.tpl`) during the infra workflow. The four runtime-only API secrets (`YOUTUBE_API_KEY`, `DISCORD_BOT_TOKEN`, `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`) are written to `/opt/familyshield/.env` by the app deploy workflow — docker-compose reads this `.env` file automatically.

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

**Critical:** Steps 6–8 create IAM policy (tenant-wide), three compartments (dev/staging/prod), and state bucket. Without these, `tofu apply` fails. Script is idempotent — safe to re-run.

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

## Repository Structure Rules (Non-Negotiable)

The canonical structure is defined in `README.md`. Every file and folder must live in its correct location. **Never scatter files at the repo root or outside their designated top-level folder.**

| Content Type | Correct Location | Examples |
|---|---|---|
| Application code, configs, Dockerfiles | `apps/` | `apps/api/`, `apps/portal/`, `apps/mitm/`, `apps/platform-config/` |
| Infrastructure as Code | `iac/` | modules, tfvars, templates |
| Documentation, plans, analysis | `docs/` | architecture, guides, troubleshooting, deployment-operations |
| Bootstrap and utility scripts | `scripts/` | `bootstrap-oci.sh`, `cloudflare-api.sh` |
| CI/CD pipelines and reusable actions | `.github/` | workflows, actions |

**Banned at repo root:** planning docs, analysis files, config folders, binaries, rendered templates, or any file that belongs in a subdirectory. Only these files belong at root: `README.md`, `CLAUDE.md`, `SETUP.md`, `LICENSE`, `.env.example`, `FamilyShield.code-workspace`, `.gitignore`.

**Service runtime configs** (grafana, nodered, ntfy, etc.) → `apps/platform-config/`  
**Planning and analysis documents** → `docs/` (e.g., `docs/deployment-operations/`, `docs/architecture/`)  
**Never create `config/`, `data/`, `build/`, `dist/` at repo root.**

When asked to create or move any file, check its type against this table first. If it doesn't belong at root, put it in the right folder without asking.

---

## Documentation Rules (Non-Negotiable)

These rules govern where documentation content lives. Follow them for every session.

### Where Content Belongs

| Content Type | Target File |
|---|---|
| System design, ADRs, topology diagrams, data flows, security model | `docs/architecture/README.md` |
| Parent-facing guides, zero technical knowledge assumed | `docs/user-guide/README.md` |
| Developer and admin setup, service configuration, daily workflow | `docs/developer-guide/README.md` |
| Test strategy, coverage targets, E2E journeys | `docs/qa-framework/README.md` |
| Symptom → diagnosis → fix (both parents and admins) | `docs/troubleshooting/README.md` |

### Rules

1. **`docs/mvp-plan.md` is a tracker only.** Progress checkboxes and links to relevant sections. No explanatory content goes here. If a feature needs context, link to the relevant doc section.

2. **`CLAUDE.md` is project context, not a documentation target.** Do not add feature docs, service explanations, or setup guides here. The only exception: update these Documentation Rules if they change.

3. **Never create new documentation files without explicit user approval.** Always update an existing file instead. If content does not fit any existing file, ask before creating.

4. **Each doc serves one audience.** Do not duplicate content across files. Cross-reference with links instead.

---

## Coding Standards

- **TypeScript:** strict mode, no `any`, Zod for runtime validation
- **Python:** black formatter, flake8 lint, type hints required, docstrings on all classes
- **Terraform/OpenTofu:** `tofu fmt` before commit, tflint clean, all resources tagged
- **Authentication:** no admin, dashboard, device, alert, or internal operations without explicit authn/authz design
- **Database access:** browser clients must use publishable/anonymous keys only; privileged keys are server-side only
- **Supabase:** enable RLS on every app table, default deny, then add least-privilege policies
- **Network exposure:** no new public endpoints for admin/internal services unless explicitly protected and documented
- **Commits:** Conventional Commits (`feat:`, `fix:`, `iac:`, `docs:`, `chore:`)
- **PRs:**
  - Create on feature/fix branch
  - Target `development` (NOT main)
  - Wait for user review before merging
  - After testing in dev, create separate PR: `development` → `main`
- **Secrets:** never in code, always via environment variables or GitHub Secrets
- **Tests:** new feature = new tests, no merge without tests passing

---

## Security Baseline (Mandatory)

These rules are non-optional. Claude Code and developers must follow them for every change.

### 1. Secrets and Credentials

- Never place live secrets, API keys, private keys, tunnel tokens, JWTs, or customer data in git, docs, screenshots, examples, tests, or workflow logs.
- `NEXT_PUBLIC_*` variables must contain only values that are safe to expose to browsers.
- Supabase `service_role` keys must never be used in browser code, `NEXT_PUBLIC_*` vars, or client bundles.
- Treat all infrastructure secrets as sensitive even if a provider labels them "anon", "public", or "non-secret".
- Never write sensitive values to `GITHUB_OUTPUT`, job summaries, PR comments, Terraform outputs, or console logs unless masked and strictly required.
- Examples in docs must use placeholders only, never realistic credential-shaped values.

### 2. Authentication and Authorization

- The portal must not expose alerts, devices, content events, or administrative actions without authenticated user context.
- Cloudflare Access is not a substitute for application authorization on sensitive data paths.
- Every write operation must have an explicit authorization rule.
- Internal/admin services such as AdGuard, Grafana, Node-RED, mitmproxy UI, SSH, and similar management surfaces must be protected by Zero Trust or equivalent access control before exposure.
- Do not add unauthenticated management endpoints, debug routes, or convenience backdoors.

### 3. Supabase and Data Protection

- All application tables must have Row Level Security enabled before they are used by portal or API features.
- Start with deny-by-default policies and add only the minimum required read/write access.
- Privileged database operations belong in trusted server-side code only.
- Device metadata, child activity, alerts, and risk scores are privacy-sensitive and must be treated as protected data.
- Do not assume a table is safe because access currently happens behind a tunnel.

### 4. Infrastructure and Network Exposure

- Do not introduce persistent `0.0.0.0/0` access for SSH, admin UIs, APIs, or data stores.
- Temporary broad access for CI/CD is allowed only when there is an automated tighten/cleanup step and the workflow clearly documents the fallback risk.
- Host key verification should be enabled wherever practical; disabling it requires a documented justification.
- Prefer outbound-only connectivity patterns, Zero Trust access, and least-exposed service topology.
- New public DNS routes must be reviewed as a security decision, not just a deployment step.

### 5. CI/CD and Automation

- Minimize secret scope per job and per environment.
- Do not pass secrets through unnecessary intermediate files, outputs, or summaries.
- Workflow logs must remain safe to share with collaborators.
- Deployment automation must fail safely: if hardening or cleanup does not run, this must be visible and actionable.
- Avoid long-lived credentials when a safer alternative exists; if long-lived credentials are still required, document why and constrain their permissions.

### 6. Public Repository Readiness

- Before making any part of the repo public, confirm:
  - no live secrets or secret-shaped historical artifacts are present
  - no browser path depends on privileged credentials
  - no sensitive service is publicly routable without proper access control
  - RLS/policies exist for all user-facing data tables
  - docs do not instruct unsafe secret usage
- Public-readiness is a separate review gate and must not be assumed from successful deployment alone.

---

## Security Hardening Plan

This is the minimum hardening sequence Claude Code should recommend and preserve.

### Phase A — Immediate

1. Replace any use of Supabase `service_role` keys in values named or treated as browser-safe credentials.
2. Add application authentication to the portal before exposing real device or alert data.
3. Enable RLS and create explicit policies for `content_events`, `alerts`, and `devices`.
4. Restrict public/tunneled routes so only intended services are exposed.
5. Stop writing sensitive tunnel or infrastructure values to reusable workflow outputs unless masked and unavoidable.

### Phase B — Short Term

1. Remove or reduce reliance on `StrictHostKeyChecking=no` where possible.
2. Separate public app traffic from admin traffic with distinct access controls and clearer routing.
3. Review all workflow permissions and secret exposure paths for least privilege.
4. Add security-focused CI checks: secret scanning, dependency audit, and config linting.

### Phase C — Ongoing

1. Re-audit any new endpoint, table, workflow, or third-party integration before rollout.
2. Keep docs aligned with secure operating practice; insecure examples are treated as bugs.
3. Re-run a public-readiness review before any visibility change or open-source release.

---

## Development Best Practices (Always Follow)

### Design and Architecture

- Preserve the core architecture decisions, but do not use architecture consistency as a reason to keep insecure defaults.
- Prefer secure-by-default implementations over convenience-first shortcuts.
- Build features so auth, authorization, validation, and auditing are part of the initial design, not follow-up work.

### Code Changes

- Validate all untrusted input, including URLs, IDs, webhook payloads, headers, and query parameters.
- Add explicit error handling for external systems without leaking sensitive internals in responses or logs.
- Avoid broad permissions, wildcard access, or implicit trust between services.
- If a feature handles protected family or child activity data, document its trust boundary and access path.

### Reviews and Testing

- Every feature PR should consider auth, data exposure, secret handling, and logging impact.
- Add tests for authorization and access control when changing user-facing data flows.
- Treat missing security tests for sensitive features as an incomplete implementation.
- If a workaround weakens security temporarily, document the reason, expiry condition, and cleanup step.

### Documentation and AI Guidance

- Claude Code should challenge unsafe instructions rather than silently following them.
- If docs, prompts, or prior notes conflict with secure practice, update the docs and follow the secure path.
- When asked to expose a service, add credentials to client code, or weaken access controls, Claude Code must explicitly call out the risk and propose the safer alternative.

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

### Caddy — Moved from Systemd to Docker (2026-04-19 — REFACTORED)

**Change:** Caddy is now a Docker service in `docker-compose.yml`, not a systemd unit.

**Why:** Systemd Caddy failed to start reliably during VM bootstrap, causing infra-dev.yml workflow to fail and block cloudflared startup. Docker-managed services are simpler and more reliable.

**How it works now:**

- `docker-compose.yaml.tpl` includes `caddy` service
- Depends on `headscale` service (waits for it to be healthy)
- Mounts `/etc/caddy/Caddyfile` (written by cloud-init, already exists)
- Auto-restarts on failure via docker-compose
- No manual intervention needed

**Architecture:**

```
Device enrollment request
  ↓
vpn-dev.everythingcloud.ca (DNS A record → OCI public IP)
  ↓
OCI VM port 443 (Caddy Docker container)
  ↓
Caddy reverse proxy (preserves WebSocket Upgrade headers)
  ↓
Headscale (localhost:8080 in Docker)
  ↓
Device successfully enrolls in Tailscale
```

**Benefits:**

- ✅ Headscale accessible via direct public IP (not Cloudflare Tunnel)
- ✅ WebSocket Upgrade headers preserved (Tailscale Noise protocol works)
- ✅ No systemd complexity
- ✅ Auto-restart on container failure
- ✅ Fully managed by docker-compose (like all other services)

### AdGuard — Port 443 Conflict with Caddy (2026-04-18 — FIXED)

**Error:** `failed to bind host port 0.0.0.0:443/tcp: address already in use` when docker-compose starts.

**Root cause:** Caddy (systemd service) and AdGuard (docker container) both tried to bind to port 443:

- **Caddy** — HTTPS reverse proxy for Headscale on `0.0.0.0:443`
- **AdGuard** — DoH (DNS over HTTPS) on `0.0.0.0:443`

**Fix (commit 1ac8bd7):** Removed `443:443/tcp` port binding from AdGuard in `docker-compose.yaml.tpl`. Devices use standard DNS (TCP/UDP on 53) or DoT (port 853) instead.

```yaml
# Before
ports:
  - "53:53/tcp"
  - "53:53/udp"
  - "3080:80/tcp"
  - "443:443/tcp"     # ← Removed — conflicts with Caddy
  - "853:853/tcp"

# After
ports:
  - "53:53/tcp"
  - "53:53/udp"
  - "3080:80/tcp"
  - "853:853/tcp"     # Caddy uses 443 for Headscale HTTPS proxy
```

**Pattern:** When adding a new reverse proxy (like Caddy), audit all service port bindings to avoid conflicts with well-known HTTPS ports (443).

### mitmproxy — Port Isolation (2026-04-17)

**Fix:** Updated mitmproxy CMD to use separate ports for web UI (8081) and listen mode (8888/8889). This prevents port conflicts when running mitmproxy locally alongside other services.

```yaml
# apps/mitm/Dockerfile
CMD ["mitmproxy", "--listen-port", "8888", "--mode", "transparent", "--web-port", "8081"]
```

If you run mitmproxy locally, ensure ports 8888, 8889, and 8081 are not in use.

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

**Root cause — Part 2 (base64 line wrapping):** The `base64` command by default wraps output at 76 characters and inserts literal newlines. When the tunnel_secret is 64+ characters, base64 splits it across multiple lines, producing output like `base64data\nmore_data`. This literal `\n` in the middle of the string breaks JSON:

```json
{"tunnel_secret": "base64data\nmore_data"}  // Invalid — unescaped newline
```

Cloudflare's JSON parser rejects this as a malformed string.

**Solution — Part 1:** Replaced all JSON payload construction in `scripts/cloudflare-api.sh` with `jq -n` + `--arg` / `--argjson` flags. This ensures:

- All variables are safely escaped as JSON values
- Special characters don't corrupt the payload
- JSON is guaranteed to be valid before transmission

**Solution — Part 2:** Fixed base64 line wrapping in `create_tunnel()`:

```bash
# base64 -w 0 disables line wrapping (default wraps at 76 chars, inserting \n)
local tunnel_secret_b64=$(echo -n "$tunnel_secret" | base64 -w 0)
```

Also added defensive whitespace trimming in `setup_cloudflare()` function:

```bash
# Strip leading/trailing whitespace (handles carriage returns, newlines, etc.)
tunnel_secret=$(echo "$tunnel_secret" | tr -d '[:space:]')
```

This ensures the base64-encoded tunnel_secret doesn't contain unwanted line breaks, and input parameters are clean.

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

### VPN A Record Hardcoded IP — tfvars Overrides TF_VAR (2026-04-20 — FIXED)

**Problem:** `vpn-dev.everythingcloud.ca` DNS A record was not updated with the new VM IP after VM recreation. Tailscale enrollment failed with connection refused.

**Root cause:** `iac/cloudflare/environments/dev/terraform.tfvars` had `oci_public_ip = "40.233.115.22"` hardcoded. In OpenTofu, **tfvars values take precedence over `TF_VAR_*` environment variables**. The workflow correctly injected the live IP via `TF_VAR_oci_public_ip`, but the hardcoded tfvars value silently won.

**Fix:** Removed `oci_public_ip` from `iac/cloudflare/environments/dev/terraform.tfvars` entirely. The live IP is now injected only via `TF_VAR_oci_public_ip` in `infra-dev.yml` (captured from `tofu output vm_public_ip`). Same pattern for prod (already had no hardcoded value) and new staging tfvars.

**Rule:** Never set a variable in both tfvars AND as `TF_VAR_*` when the env var is the dynamic authoritative source. Leave it out of tfvars entirely.

---

### OCI NSG — tighten-ssh via tofu apply (2026-04-16)

**Problem:** Three iterations of OCI CLI commands all failed (`security-group-rule`, `nsg rule`, `nsg-security-rules`) — the correct command either doesn't exist in the runner's OCI CLI version or produces unexpected errors.

**Root cause (architectural):** The NSG is managed by OpenTofu state. Using OCI CLI to modify it directly causes state drift — OpenTofu believes the NSG has `0.0.0.0/0` while the actual resource has been tightened. Any subsequent `tofu apply` would revert the tightening.

**Solution:** `tighten-ssh-dev` and `tighten-ssh-prod` now run a second `tofu apply` with `TF_VAR_admin_ssh_cidrs='["173.33.214.49/32"]'`. This:
- Keeps the NSG in sync with OpenTofu state
- Uses no OCI CLI NSG commands at all
- Is idempotent — re-running has no effect if already tightened

```yaml
env:
  TF_VAR_admin_ssh_cidrs: '["173.33.214.49/32"]'
run: |
  tofu init ...
  tofu apply -var="environment=dev" -var-file="environments/dev/terraform.tfvars" -auto-approve -no-color
```

The `admin_ssh_cidrs` variable (default `["0.0.0.0/0"]`) is defined in `iac/variables.tf`. The first `tofu apply` in `deploy-infra-{env}` deploys with the default (open). The second `tofu apply` in `tighten-ssh-{env}` overrides it to admin IP only.

### Cloudflare Access App — Tags Error 12130 (2026-04-16 — FIXED)

**Error:** `access.api.error.invalid_request: tags contain a tag that does not exist, tags must be created before assigning to an application`

**Root cause:** `scripts/cloudflare-api.sh` was passing `tags: ["familyshield", "admin"]` and `tags: ["familyshield", "ssh"]` in Access Application payloads. Cloudflare requires tags to be pre-created in the Zero Trust dashboard before they can be assigned to an application. Since these tags never existed, the API returned error 12130 and the apps were never created.

**Fix (commit 12ebf77):** Removed the `tags` field entirely from all Access Application payloads in `create_access_application()` and `create_ssh_access_app()`. Tags are cosmetic organization — removing them has no functional impact on tunnel routing or Zero Trust policies.

**Pattern:** Never pass `tags` to Cloudflare Access Application API calls unless those exact tag names have been manually pre-created in Zero Trust → Settings → Tags.

### Bootstrap Step — docker: command not found on Fresh VM (2026-04-16 — FIXED)

**Error:** `bash: line 3: docker: command not found` when the `Bootstrap VM` step in `setup-cloudflare-{env}` tries to run docker commands on a freshly provisioned VM.

**Root cause:** The bootstrap step SSHes to the VM and immediately runs `docker compose up` etc. On a fresh VM, cloud-init is still running and hasn't finished installing Docker, docker-compose, and other packages. The step was racing against cloud-init.

**Fix (commit 1df4dcd):** Added `sudo cloud-init status --wait || true` as the first command in the bootstrap SSH heredoc (in both `infra-dev.yml` and `infra-prod.yml`). This blocks until cloud-init finishes before any docker commands run.

```bash
ubuntu@"$VM_IP" bash -s <<ENDSSH
set -euo pipefail
sudo cloud-init status --wait || true   # ← wait for Docker to be installed
cd /opt/familyshield
echo "${GHCR_TOKEN}" | docker login ghcr.io ...
ENDSSH
```

The `|| true` ensures the step doesn't fail if cloud-init has already completed (exit code 2 = "done") or if the command itself is unavailable.

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

**Error:** `Authentication error (10000)` when creating Argo Tunnel or Access Applications, or `Invalid request: tags contain a tag that does not exist (12130)` on service token creation.

**Cause:** The `iac/cloudflare/` OpenTofu module requires **ALL FIVE** scopes:

- Zone → DNS → Edit (for CNAME records)
- Account → Cloudflare Tunnel → Edit (for Argo Tunnel)
- Account → Access: Apps and Policies → Edit (for Zero Trust apps)
- Account → Access: Service Tokens → Edit (for CI service token)
- Zone → Config Rules → Edit (for WAF security level ruleset)

The "Edit zone DNS" template only grants the first scope — insufficient. The old 3-scope token used by `cloudflare-api.sh` is also insufficient for the new OpenTofu module.

**Fix:** Recreate token in Cloudflare dashboard as Custom Token with all 5 scopes, update `CLOUDFLARE_API_TOKEN` GitHub secret, re-run `infra-dev.yml`.

### Bot Fight Mode — Blocks GitHub Actions Before Access Policy Evaluation

**Error:** `cf-mitigated: challenge` on SSH endpoint; `verify-tunnel` times out after 5 attempts even with correct service token credentials.

**Cause:** Cloudflare Bot Fight Mode (free tier) fires *before* Access policy evaluation and blocks GitHub Actions datacenter IPs. The WAF config rule (`security_level = "essentially_off"`, `bic = false`) in `iac/cloudflare/waf.tf` handles Security Level and BIC only — it does not disable Bot Fight Mode, which is a separate zone-level toggle not controllable via API on the free tier.

**Fix (one-time, manual):** Cloudflare dashboard → Security → Bots → Bot Fight Mode → OFF. This must be done once per zone; it is not automated.

### cloudflared ProxyCommand — Must Use Explicit Credential Flags

**Error:** `verify-tunnel` makes 5 SSH attempts, all failing silently. cloudflared finds no credentials.

**Cause:** cloudflared reads `TUNNEL_SERVICE_TOKEN_ID` / `TUNNEL_SERVICE_TOKEN_SECRET` env vars — **not** `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET`. Those are HTTP header names, not cloudflared env var names. Setting `CF_ACCESS_CLIENT_ID` as an environment variable has no effect on cloudflared.

**Fix:** Pass credentials explicitly via flags in every ProxyCommand:

```bash
-o ProxyCommand="cloudflared access ssh \
  --hostname ${SSH_HOST} \
  --service-token-id ${CF_ACCESS_CLIENT_ID} \
  --service-token-secret ${CF_ACCESS_CLIENT_SECRET}"
```

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

## Recent Improvements & Key Commits (2026-04-21)

**Device enrolment (PR #32 — open):**

- F-27: `headscale.yaml` DNS push — `nameservers: [172.20.0.2]` + `override_local_dns: true`
- F-28: iptables REDIRECT rules added to `cloud-init.yaml.tpl` (first-boot) and `infra-dev.yml` bootstrap (existing VM, idempotent). `iptables-persistent` package persists rules across reboots.
- F-29: Portal `/cert` page + API `GET /cert` endpoint. NavBar "Setup" link. Per-OS install instructions (iOS, macOS, Android, Windows).
- Design principles table added to `docs/mvp-plan.md` (security, KISS, no reinvention, low cost, scalable)

**Infrastructure (PR #31 — merged):**

- Portainer service (port 9000, Zero Trust email OTP access)
- VPN IP dynamic injection fixed — removed hardcoded `oci_public_ip` from tfvars; `TF_VAR_oci_public_ip` from workflow wins
- Caddy Caddyfile: `localhost:8080` → `172.20.0.3:8080` (Docker bridge IP — containers cannot use localhost for sibling services)

**Workflow cleanup (merged):**

- All `cron:` schedules removed from all workflows — everything is now `workflow_dispatch` or path-triggered
- `security-scan.yml`: added path filter to prevent firing on bot commits (health check updates to docs/)
- `deploy-dev.yml`: `workflow_run` trigger fixed with `branches: [development]`
- `post-deploy-tunnel-ssh-dev.yml`: deleted (referenced a workflow that no longer exists)
- Health status moved from README.md (auto-updated, cluttering) to `docs/status/health.md`

---

## Troubleshooting Portal E2E Tests

### 0 alert-row elements in alerts tests

**Symptom:** `getByTestId('alert-row')` returns 0 elements, even though MOCK_ALERTS is defined.

**Root cause:** `AlertTable` was fetching data server-side (RSC), which bypasses Playwright's `page.route()` mocks.

**Solution:** Move fetch to client-side `useEffect`:

```tsx
// ❌ Server-side fetch (RSC) — Playwright can't mock
export default async function AlertsPage() {
  const { data } = await supabase.from('alerts').select('*')
  return <AlertTable initialAlerts={data} />
}

// ✅ Client-side fetch (useEffect) — Playwright can mock via page.route()
'use client'
export function AlertTable() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  useEffect(() => {
    getSupabase().from('alerts').select('*')
      .then(({ data }) => setAlerts(data ?? []))
  }, [])
}
```

### Wrong empty state message or active link color

**Wrong text:** Test expects `'No alerts yet'` but component renders `'All clear — no alerts yet'`
**Wrong class:** Test expects `text-teal-400` but active nav link uses `text-accent-400`

**Solution:** Check actual rendered text/classes in component source before updating test assertions. Component takes precedence over test expectations.

### Modal backdrop click not working

**Problem:** `page.mouse.click(10, 10)` uses absolute viewport coordinates, can be intercepted by NavBar (z-50).

**Solution:** Click relative to the element itself:

```typescript
// ❌ Wrong — viewport-absolute, unreliable
await page.mouse.click(10, 10)

// ✅ Right — relative to element
await page.getByTestId('enroll-modal').click({ position: { x: 5, y: 5 } })
```

### Tests pass locally but fail in CI

**Common cause:** `NEXT_PUBLIC_SUPABASE_URL` is set in CI (isSupabaseConfigured() = true), so demo mode never activates. Use Playwright mocks instead.

**In local tests:** Playwright mocks intercept browser-side requests, falling back to MOCK_ALERTS defined in test.

**In CI:** Same mocks apply, no demo mode fallback needed.

---

## How to Continue in Claude Code

When starting a new Claude Code session, just say:

> "Read CLAUDE.md and continue building FamilyShield from where we left off."

Claude Code will read this file and know exactly what's done and what's next.

For specific tasks, say things like:

- "Build `apps/api/src/types.ts` — the shared TypeScript types"
- "Scaffold the Next.js 16 portal in `apps/portal/`"
- "Build the ntfy alert dispatcher"
- "Write the user guide in `docs/user-guide/README.md`"

---

## Current Build Status

### ✅ Phase 0: Scaffold

Infrastructure, CI/CD, IaC modules, mitmproxy addon (complete with 15 tests), API skeleton with enrichers.

### ✅ Phase 1: Agents, Skills, Docs, Diagrams

Full architecture documentation, C4 model, user guide, troubleshooting, Claude Agent SDK agents, slash command skills.

### 🔄 Phase 2: Device-Testable Application (IN PROGRESS)

**Infrastructure & Deployment:**

- ✅ IaC + app workflows split by path (`iac/**` vs `apps/**`)
- ✅ Cloudflare migrated to separate OpenTofu root (`iac/cloudflare/`) with WAF singleton fix
- ✅ Portainer service (port 9000, Zero Trust email OTP)
- ✅ VPN IP injection: removed hardcoded tfvars, `TF_VAR_oci_public_ip` from workflow is authoritative
- ✅ Caddy in Docker (172.20.0.11) proxying Headscale at Docker bridge IP (172.20.0.3:8080)
- ✅ All workflow schedules removed — manual or path-triggered only
- ✅ **F-27: Headscale DNS push** — `headscale.yaml` pushes AdGuard `172.20.0.2` to enrolled devices
- ✅ **F-28: iptables REDIRECT** — cloud-init + infra-dev.yml bootstrap; persisted via iptables-persistent
- 🔲 **2a.1: AdGuard upstream DNS** — manual step (SSH port-forward → admin UI → add `8.8.8.8`/`1.1.1.1`)
- 🔲 First full end-to-end pipeline run (infra-dev + deploy-dev all green)

**Application Development:**

- ✅ API: enrichers (YouTube, Roblox, Discord, Twitch), alert dispatcher, LLM router, `GET /cert` endpoint
- ✅ mitmproxy addon (15 tests)
- ✅ **Portal: 4 pages** — dashboard, /devices, /alerts, /cert (Setup)
  - `/cert` page: per-OS install instructions (iOS, macOS, Android, Windows) + download button
  - Client-side `useEffect` fetching for Playwright test mockability
  - Supabase Realtime WebSocket live updates
- ✅ **F-29: Portal cert page** — `apps/portal/app/cert/page.tsx` + NavBar "Setup" link
- ✅ Portal E2E testing: 24 tests (Playwright — Chromium, Firefox, Mobile Chrome)
- ✅ Supabase tables: `devices`, `content_events`, `alerts` with RLS enabled
- 🔲 Phase 2 acceptance: Enrol one device → real traffic → ntfy alert to parent phone

### 📋 Phase 3: E2E Testing & Production Release

Full integration testing, security hardening, load testing, production release.

---

FamilyShield · Everythingcloudsolutions · Canada · 2026
