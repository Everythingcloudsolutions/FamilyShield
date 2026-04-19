# FamilyShield 🛡️

> Intelligent Digital Safety for Every Child, Everywhere.

**Cloud-First · Power-Resilient · Open Source · IaC-Driven**

[![Deploy → Dev](https://github.com/Everythingcloudsolutions/FamilyShield/actions/workflows/deploy-dev.yml/badge.svg?branch=development)](https://github.com/Everythingcloudsolutions/FamilyShield/actions/workflows/deploy-dev.yml)
[![Deploy Staging](https://github.com/Everythingcloudsolutions/FamilyShield/actions/workflows/deploy-staging.yml/badge.svg)](https://github.com/Everythingcloudsolutions/FamilyShield/actions/workflows/deploy-staging.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](LICENSE)

---

## 🏥 Health Status

**Last checked:** 2026-04-19 11:39:43 UTC

### Dev Environment

<!-- HEALTH_TABLE_DEV_START -->
| Service | Status | Response Time |
|---------|--------|----------------|
| Portal | ✅ HTTP 200 | 461ms |
| API | ✅ HTTP 200 | 290ms |
| AdGuard Home | ✅ HTTP 302 | 72ms |
| Headscale | ❌ HTTP 000000 | 23ms |
| mitmproxy | ⚠️ HTTP 403 | 314ms |
| Grafana | ✅ HTTP 302 | 80ms |
| Node-RED | ✅ HTTP 200 | 320ms |
| ntfy | ✅ HTTP 200 | 256ms |
| Redis | ✅ healthy | 1574ms |
| InfluxDB | ✅ healthy | 1022ms |
<!-- HEALTH_TABLE_DEV_END -->

### Prod Environment

<!-- HEALTH_TABLE_PROD_START -->
| Service | Status | Response Time |
|---------|--------|----------------|
| Portal | ❌ HTTP 530 | 49ms |
| API | ❌ HTTP 530 | 77ms |
| AdGuard Home | ❌ HTTP 530 | 49ms |
| Headscale | ❌ HTTP 000000 | 60ms |
| mitmproxy | ❌ HTTP 530 | 50ms |
| Grafana | ❌ HTTP 530 | 51ms |
| Node-RED | ❌ HTTP 530 | 84ms |
| ntfy | ❌ HTTP 000000 | 15ms |
| Redis | ❌ unhealthy | 88ms |
| InfluxDB | ❌ unhealthy | 87ms |
<!-- HEALTH_TABLE_PROD_END -->

---

## What Is FamilyShield?

FamilyShield is a comprehensive parental control platform that gives parents complete visibility and control over what their children access online — across every device, every network, and every platform — at near-zero cost.

Unlike commercial solutions that rely on home hardware and fail when the power goes out, FamilyShield's enforcement core lives permanently in the cloud on Oracle Cloud Infrastructure's Always Free tier.

---

## Key Capabilities

| Capability | Details |
|---|---|
| **DNS Filtering** | AdGuard Home — per-device profiles, always-on |
| **VPN Mesh** | WireGuard/Tailscale — auto-connects when away from home |
| **SSL Inspection** | mitmproxy — captures video IDs, game IDs, API calls |
| **Platform APIs** | YouTube, Roblox, Twitch, Discord enrichment |
| **AI Risk Scoring** | Groq (primary) + Anthropic (fallback) |
| **Parent Portal** | Next.js 14 · Cloudflare Pages · Supabase Realtime |
| **Out-of-Home** | iOS MDM profile · Windows WireGuard agent |

---

## Cost

| Item | Monthly Cost |
|---|---|
| OCI ARM VM (all backend services) | $0 CAD |
| Cloudflare Tunnel + DNS | $0 CAD |
| Supabase database | $0 CAD |
| Groq API (primary LLM) | $0 CAD |
| Anthropic Haiku (fallback LLM) | ~$0.02 CAD |
| **Total** | **~$1–2 CAD (electricity only)** |

---

## Repository Structure

```
FamilyShield/
├── .devcontainer/          # VS Code Remote Dev Container (OCI ARM)
├── .github/
│   ├── workflows/          # CI/CD pipelines
│   └── actions/            # Reusable composite actions
├── iac/                    # OpenTofu Infrastructure as Code
│   ├── modules/            # Reusable Terraform modules
│   └── environments/       # Per-environment variable files
├── apps/
│   ├── portal/             # Next.js 14 parent portal
│   ├── api/                # Node.js enrichment worker + API
│   ├── mitm/               # mitmproxy Python addon
│   ├── agent-iac/          # IaC management agent
│   ├── agent-cloud/        # Cloud environment agent
│   ├── agent-api/          # Platform API agent
│   └── agent-mitm/         # Traffic inspection agent
├── docs/                   # Full documentation suite
│   ├── architecture/       # C4 model, wire diagrams, flow diagrams
│   ├── user-guide/         # For parents (non-technical)
│   ├── developer-guide/    # For contributors
│   ├── qa-framework/       # QA strategy and test plans
│   ├── testing/            # Test configs and fixtures
│   ├── troubleshooting/    # Common failure modes
│   └── diagrams/           # Excalidraw / draw.io source files
└── scripts/                # Helper scripts (bootstrap, enrol-device, etc.)
```

---

## Quick Start (Developer)

> **Prerequisites:** OCI account (ca-toronto-1), Cloudflare account, GitHub repo access

```bash
# 1. Clone the repo
git clone https://github.com/Everythingcloudsolutions/FamilyShield.git
cd FamilyShield

# 2. Open in VS Code — Remote SSH to OCI dev instance
code --remote ssh-remote+familyshield-dev .

# 3. Bootstrap OCI (first time only)
./scripts/bootstrap-oci.sh

# 4. Deploy to dev
git push origin main  # GitHub Actions handles the rest
```

→ See [Developer Guide](docs/developer-guide/README.md) for full setup.

---

## Deployment Architecture

FamilyShield uses a **three-stage deployment pipeline** to ensure infrastructure stability and independent service management:

```
Merge to main
    ↓
[Stage 1] deploy-dev.yml
└─ OCI Infrastructure (VM, networks, storage, database)
   ↓ (on success)
[Stage 2] deploy-cloudflare.yml (automatic)
└─ Cloudflare resources (tunnel, DNS, Zero Trust access)
   ↓ (parallel)
[Stage 3] build-and-push + deploy-app-dev
└─ Docker images & app containers
```

**Why three stages?**

- **Stage 1 (IaC):** Creates cloud infrastructure independently — no state conflicts
- **Stage 2 (Cloudflare API):** Manages DNS and public routing separately — decoupled from IaC
- **Stage 3 (App):** Deploys application code after both infrastructure and networking are ready

See [Architecture Docs](docs/architecture/README.md) for detailed flow diagrams.

## Deployment Environments

| Environment | Trigger | Approval |
|---|---|---|
| `dev` | Auto on merge to `development` | None |
| `staging` | Auto after dev passes | None |
| `prod` | Manual workflow dispatch | **Required — GitHub UI** |

---

## Documentation

- [User Guide](docs/user-guide/README.md) — For parents
- [Developer Guide](docs/developer-guide/README.md) — For contributors
- [Architecture](docs/architecture/README.md) — C4 model, diagrams
- [QA Framework](docs/qa-framework/README.md) — Test strategy
- [Troubleshooting](docs/troubleshooting/README.md) — Common issues

---

## License

MIT — see [LICENSE](LICENSE)

---

*Built with ❤️ in Canada · OCI Toronto (ca-toronto-1) · 2026*
