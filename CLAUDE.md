# FamilyShield — Claude Project Memory

> This file is read automatically by Claude Code at the start of every session.
> Keep it updated as the project evolves.
> Last updated: 2026-04-05

---

## Who Am I Talking To

- **Owner:** Mohit (Everythingcloudsolutions)
- **Location:** Canada
- **Currency:** Always use CAD ($) — never GBP or USD
- **Year:** 2026 — always use 2026 in dates, docs, comments, version refs

---

## Project: FamilyShield

Intelligent parental control platform. Cloud-first, open source, IaC-driven.

**GitHub repo:** https://github.com/Everythingcloudsolutions/FamilyShield (private)
**Portal URL (dev):** https://familyshield-dev.everythingcloud.ca
**Portal URL (prod):** https://familyshield.everythingcloud.ca
**Domain:** familyshield.everythingcloud.ca (subdomain of everythingcloud.ca — Cloudflare)

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
│   ├── portal/                  ← Next.js 14 parent portal [NOT YET BUILT]
│   ├── api/                     ← Node.js enrichment worker + Express health
│   │   └── src/
│   │       ├── index.ts
│   │       ├── worker/event-consumer.ts
│   │       ├── llm/router.ts    ← Groq → Anthropic fallback
│   │       └── enrichers/       ← youtube.ts, roblox.ts, twitch.ts, discord.ts
│   ├── mitm/                    ← mitmproxy Python addon
│   │   ├── familyshield_addon.py
│   │   └── tests/test_addon.py
│   ├── agent-iac/               ← [NOT YET BUILT] IaC management agent
│   ├── agent-cloud/             ← [NOT YET BUILT] Cloud environment agent
│   ├── agent-api/               ← [NOT YET BUILT] Platform API agent
│   └── agent-mitm/              ← [NOT YET BUILT] Traffic inspection agent
├── docs/
│   ├── architecture/README.md   ← C4 model L1-L3, Mermaid diagrams, wire diagram
│   ├── developer-guide/README.md
│   ├── qa-framework/README.md
│   ├── user-guide/              ← [NOT YET BUILT]
│   ├── troubleshooting/         ← [NOT YET BUILT]
│   └── diagrams/                ← [NOT YET BUILT] draw.io / Excalidraw sources
└── scripts/
    ├── bootstrap-oci.sh         ← First-time OCI setup
    └── setup-github.sh          ← GitHub environments + branch protection
```

---

## Current Build Status

### ✅ DONE — Phase 0: Scaffold

| File / Component | Status |
|---|---|
| Monorepo structure (all dirs) | ✅ |
| `.gitignore`, `.env.example` | ✅ |
| `FamilyShield.code-workspace` | ✅ |
| `.devcontainer/devcontainer.json` | ✅ |
| `.devcontainer/post-create.sh` | ✅ |
| GitHub Actions: `pr-check.yml` | ✅ |
| GitHub Actions: `deploy-dev.yml` | ✅ |
| GitHub Actions: `deploy-staging.yml` | ✅ |
| GitHub Actions: `deploy-prod.yml` (manual gate) | ✅ |
| Reusable action: `oci-login` | ✅ |
| Reusable action: `tofu-plan` (posts PR comment) | ✅ |
| Reusable action: `tofu-apply` | ✅ |
| IaC: `iac/main.tf` (root orchestration) | ✅ |
| IaC: `iac/variables.tf` | ✅ |
| IaC: `iac/outputs.tf` | ✅ |
| IaC module: `oci-compartments` | ✅ |
| IaC module: `oci-network` | ✅ |
| IaC module: `oci-compute` (Always Free ARM) | ✅ |
| IaC module: `oci-storage` (3 buckets) | ✅ |
| IaC module: `cloudflare-dns` (Tunnel + ZT) | ✅ |
| IaC module: `supabase` | ✅ |
| IaC module: `docker-services` | ✅ |
| Template: `cloud-init.yaml.tpl` | ✅ |
| Template: `docker-compose.yaml.tpl` (10 services) | ✅ |
| `scripts/bootstrap-oci.sh` | ✅ |
| `scripts/setup-github.sh` | ✅ |
| `apps/mitm/familyshield_addon.py` | ✅ |
| `apps/mitm/tests/test_addon.py` (15 tests) | ✅ |
| `apps/mitm/Dockerfile` | ✅ |
| `apps/api/package.json` | ✅ |
| `apps/api/src/index.ts` | ✅ |
| `apps/api/src/worker/event-consumer.ts` | ✅ |
| `apps/api/src/llm/router.ts` | ✅ |
| `apps/api/src/enrichers/` (all 4 platforms) | ✅ |
| `docs/architecture/README.md` (C4 + Mermaid) | ✅ |
| `docs/developer-guide/README.md` | ✅ |
| `docs/qa-framework/README.md` | ✅ |

### ✅ DONE — Phase 1: Agents, Skills, Docs, Diagrams

| File / Component | Status |
|---|---|
| `docs/architecture/README.md` — Assumptions A1-A12, ADRs 1-11 | ✅ |
| `docs/user-guide/README.md` — non-technical parent guide (12 sections) | ✅ |
| `docs/troubleshooting/README.md` — parent + developer guide (1,393 lines) | ✅ |
| `docs/diagrams/network-wire.drawio` — 5-zone swimlane wire diagram | ✅ |
| `docs/diagrams/data-model.drawio` — 8-table ER diagram | ✅ |
| `docs/diagrams/system-overview.excalidraw` — high-level Excalidraw | ✅ |
| `docs/diagrams/data-flow.excalidraw` — 8-step content event flow | ✅ |
| `.claude/commands/deploy.md` — /deploy skill | ✅ |
| `.claude/commands/enrol-device.md` — /enrol-device skill | ✅ |
| `.claude/commands/check-health.md` — /check-health skill | ✅ |
| `.claude/commands/review-alerts.md` — /review-alerts skill | ✅ |
| `apps/agent-iac/` — IaC management agent (10 files, Claude Agent SDK) | ✅ |
| `apps/agent-cloud/` — Cloud environment agent (10 files, Claude Agent SDK) | ✅ |
| `apps/agent-api/` — Platform API agent (11 files, Claude Agent SDK) | ✅ |
| `apps/agent-mitm/` — Traffic inspection agent (14 files, Claude Agent SDK) | ✅ |

### 🔲 TODO — Phase 2: API, Portal, CI/CD

| File / Component | Priority |
|---|---|
| `apps/api/src/types.ts` — shared TypeScript types | HIGH |
| `apps/api/src/lib/redis.ts` — Redis client factory | HIGH |
| `apps/api/src/lib/supabase.ts` — Supabase client factory | HIGH |
| `apps/api/src/alerts/dispatcher.ts` — ntfy push alerts | HIGH |
| `apps/api/tsconfig.json` | HIGH |
| `apps/api/Dockerfile` | HIGH |
| `apps/portal/` — full Next.js 14 scaffold | HIGH |
| `apps/portal/src/app/` — layout, auth, dashboard pages | HIGH |
| `.github/workflows/app-build.yml` — Docker image build | MEDIUM |
| `docs/testing/fixtures/` — Supabase SQL migrations | MEDIUM |
| `scripts/dev-start.sh` — local dev startup | MEDIUM |
| `scripts/enrol-device.sh` — iOS/Windows device setup | MEDIUM |

---

## GitHub Environments & Deployment Flow

```
PR opened → pr-check.yml runs → tofu plan posted as PR comment
    ↓
Merge to main → deploy-dev.yml → auto deploy to dev
    ↓
dev passes → deploy-staging.yml → auto deploy to staging
    ↓
Manual trigger → deploy-prod.yml → Mohit approves in GitHub UI → prod deploy
```

**Environments in GitHub:**
- `dev` — auto, no approval needed
- `staging` — auto after dev passes
- `prod` — **manual approval required** (Mohit must click Approve in GitHub UI)

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

---

## Docker Services on OCI VM (all 10)

| Container | Port | Purpose |
|---|---|---|
| `familyshield-adguard` | 53, 3080 | DNS filtering, per-device profiles |
| `familyshield-headscale` | 8080 | Tailscale control plane (WireGuard VPN) |
| `familyshield-mitmproxy` | 8888, 8889 | SSL inspection, content ID extraction |
| `familyshield-redis` | 6379 | Event queue (mitmproxy → API worker) |
| `familyshield-api` | 3001 | Enrichment worker + health endpoint |
| `familyshield-nodered` | 1880 | Rule engine / flow automation |
| `familyshield-influxdb` | 8086 | Time-series metrics |
| `familyshield-grafana` | 3001 | Usage dashboards |
| `familyshield-ntfy` | 2586 | Push notifications to parent phone |
| `familyshield-cloudflared` | — | Cloudflare Tunnel daemon (outbound only) |

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

## Coding Standards

- **TypeScript:** strict mode, no `any`, Zod for runtime validation
- **Python:** black formatter, flake8 lint, type hints required, docstrings on all classes
- **Terraform/OpenTofu:** `tofu fmt` before commit, tflint clean, all resources tagged
- **Commits:** Conventional Commits (`feat:`, `fix:`, `iac:`, `docs:`, `chore:`)
- **PRs:** one PR per feature, tofu plan comment reviewed before merge
- **Secrets:** never in code, always via environment variables or GitHub Secrets
- **Tests:** new feature = new tests, no merge without tests passing

---

## Key Design Principles (never compromise these)

1. **Always-On** — enforcement in cloud, not home hardware
2. **Privacy First** — content IDs extracted, not frames or message content
3. **Full Transparency** — children know monitoring is active
4. **Age-Adaptive** — 3 profiles: 6-10 (strict), 11-14 (moderate), 15-17 (guided)
5. **IaC-Driven** — everything reproducible via `tofu apply`
6. **Modular** — every component swappable without touching others

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

## Session History Reference

Full design session archived at: claude.ai (this conversation)
The complete proposal documents (PPTX + Word) are in the outputs of that session.
