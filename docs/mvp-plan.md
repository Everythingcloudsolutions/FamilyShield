# FamilyShield — MVP Plan, Feature List & Development Roadmap

> Last updated: 2026-04-21
> Audience: Developer (Mohit) + Claude Code — this is the anchor document for all active development
> Status tracker: See Phase checklists below. Update this file as items are completed.
> **Current phase:** Phase 2 — Device-Testable Application (steps 2a + 2b)

---

## Design Principles (Non-Negotiable)

Every feature and architectural decision must be evaluated against these five principles:

| Principle | What It Means in Practice |
|---|---|
| **Security is paramount** | Default-deny network access. Zero Trust for all admin surfaces. RLS on every DB table. No secrets in code or logs. Auth before data. |
| **Keep it simple (KISS)** | Prefer one working tool over two half-working ones. No premature abstractions. A single OCI VM beats a Kubernetes cluster at this scale. |
| **Don't reinvent the wheel** | Use Tailscale/Headscale (VPN), AdGuard Home (DNS), mitmproxy (HTTPS inspection), Supabase (DB+realtime), ntfy (push). These are proven open-source tools. |
| **Low cost & open source** | Every component must be free or near-free at family scale. OCI Always Free tier. Cloudflare free tier. Groq free tier. No SaaS lock-in. |
| **Scalable by design** | Architecture supports multiple children and devices without re-engineering. One VM today → easily expandable. Stateless app containers. Persistent data volume. |

---

## Purpose of This Document

This document defines:

- What FamilyShield MVP means and what it delivers to a parent
- The complete feature list split into MVP vs post-MVP
- Phase-by-phase todo checklists with acceptance criteria
- How each feature works from a new user's perspective
- Which user-facing documentation must be updated when each feature is built

**Rule:** Every feature shipped must update the relevant user-facing doc listed in the "Docs to Update" column before it is considered done.

---

## What Is the MVP?

**One parent. One child device. Real-time monitoring and alerts.**

A parent can:

1. Enrol a child's device into FamilyShield from the portal (no CLI needed)
2. See a live feed of what the child is watching or playing (YouTube, Roblox, Twitch, Discord)
3. Receive a push notification on their phone when the AI flags high-risk content
4. View the activity history and alerts in the parent portal

The child experiences:

- Normal internet access (DNS filtering is transparent for allowed content)
- Blocked access to TikTok and other DNS-blocked platforms
- HTTPS traffic intercepted for content ID extraction only (no content stored)
- No visibility into or control over FamilyShield's certificate or DNS settings

---

## System Architecture Recap (For Context)

```
Child Device (Tailscale enrolled)
  │
  ├─ Headscale VPN ──────────────────────────────────────────────────────┐
  │   All device traffic routes through OCI VM                           │
  │                                                                       │
  ▼                                                                       │
OCI ARM VM (ca-toronto-1)                                                │
  ├─ iptables REDIRECT ← intercepts VPN client traffic → mitmproxy:8889  │
  ├─ mitmproxy         ← transparent SSL inspection, extracts content IDs │
  ├─ AdGuard Home      ← DNS pushed to device automatically via Headscale │
  ├─ Redis             ← event queue between mitmproxy and API worker      │
  ├─ API Worker        ← enriches content IDs via platform APIs + AI       │
  ├─ ntfy              ← push notifications to parent phone                │
  ├─ Supabase          ← stores events, alerts, devices (hosted)           │
  ├─ Portal (Next.js)  ← parent dashboard + admin control plane            │
  ├─ Grafana           ← time-series dashboards (Phase 3 → portal embed)   │
  ├─ Node-RED          ← automation flows (Phase 4)                        │
  └─ InfluxDB          ← metrics storage                                   │
                                                                            │
Parent Device (browser only — no VPN required)                             │
  └─ Portal ← https://familyshield-dev.everythingcloud.ca ◄────────────────┘
```

### Key Architectural Decisions

**Headscale is a VPN control plane, not a user account system.**
Each child's device gets its own Tailscale node. Parent devices do NOT join the VPN — parents access the portal via browser only. One Headscale user per child (or one shared family user) is created server-side; preauth keys are generated per device enrolment. Per-device traceability comes from the Tailscale node identity (node IP in the `100.64.0.0/10` subnet), not from Headscale user accounts.

**mitmproxy requires an iptables REDIRECT rule to intercept VPN traffic.**
Connecting a device to Headscale alone does NOT route its traffic through mitmproxy. An `iptables REDIRECT` rule on the VM must intercept TCP port 443 traffic from VPN clients (`100.64.0.0/10` Tailscale subnet) and forward it to mitmproxy's transparent proxy listener (port 8889). Without this rule, `mitm.it` shows "traffic is not going through mitmproxy" — which is the expected behaviour. This is the single biggest missing piece right now.

**AdGuard DNS is pushed to devices via Headscale dns_config — no manual device setup.**
`headscale.yaml` has a `dns_config` section. When configured with `nameservers: ["172.20.0.2"]` and `override_local_dns: true`, enrolled devices automatically receive AdGuard as their DNS resolver. The parent never sets DNS manually on the child's device. AdGuard's upstream DNS (currently unconfigured) must also point to `8.8.8.8`/`1.1.1.1` or external resolver to work.

**The mitmproxy CA cert must be installed on the child's device once.**
For MVP: parent downloads the cert from a portal page (`/cert`) and installs it manually on the device. For production (F-33): cert is pushed silently on enrolment via MDM-style mechanism — child has no visibility or control.

**The portal is the single parent control plane.**
No routine operation should require SSH or CLI access. Key generation, device management, cert download, ntfy config, and eventually Grafana and AdGuard logs — all accessible from the portal.

---

## Complete Feature List

### MVP Features (Required to Call It Working)

| # | Feature | Component | Description | Status |
|---|---|---|---|---|
| F-01 | DNS Filtering | AdGuard | Blocks adult, gambling, malware domains for every enrolled device. Requires upstream DNS fix + Headscale DNS push. | 🔲 Upstream DNS fix needed |
| F-02 | Child Device Enrolment | Headscale + Portal | Parent opens portal → Devices → Add Device. Portal generates Tailscale preauth key + enrolment URL. No CLI. | 🔲 Portal not yet wired to Headscale API |
| F-03 | HTTPS Traffic Inspection | mitmproxy + iptables | CA cert on device + iptables redirect active = FamilyShield intercepts HTTPS to extract content IDs. | 🔲 iptables redirect missing |
| F-04 | YouTube Activity Monitoring | API + mitmproxy | Looks up video title, AI-scores for risk. | ✅ Code complete |
| F-05 | Roblox Activity Monitoring | API + mitmproxy | Looks up game name, AI-scores. | ✅ Code complete |
| F-06 | Twitch Activity Monitoring | API + mitmproxy | Looks up channel, mature content flag. | ✅ Code complete |
| F-07 | Discord Activity Monitoring | API + mitmproxy | Logs server, flags NSFW servers. | ✅ Code complete |
| F-08 | AI Risk Scoring | API (Groq + Anthropic) | 8-category risk score: low / medium / high / critical. | ✅ Code complete |
| F-09 | Push Notifications | ntfy | High/critical events → instant push to parent phone. Blocked on F-03 pipeline being active. | 🔲 Blocked on F-03 |
| F-10 | Parent Portal — Activity Feed | Portal + Supabase | Real-time feed of content events, risk colour-coded, Supabase Realtime WebSocket. | ✅ Code complete |
| F-11 | Parent Portal — Alerts Page | Portal + Supabase | All flagged alerts, filterable by device / risk / date. | ✅ Code complete |
| F-12 | Parent Portal — Devices Page | Portal + Supabase | Enrolled devices, profiles, last-seen. Add Device button. | ✅ Code complete |
| F-13 | Device Enrolment Record | Supabase + Portal | Device record auto-created in `devices` when Tailscale node joins. | 🔲 Needs Headscale webhook/poll |
| F-26 | Portal: Headscale Key Generation | Portal + Headscale API | "Add Device" calls Headscale API to generate preauth key, returns enrolment URL to parent. | 🔲 Phase 2c |
| F-27 | Headscale DNS Push | headscale.yaml | `dns_config` pushes `172.20.0.2` to enrolled devices automatically. Parent never sets DNS manually. | ✅ Done — headscale.yaml updated |
| F-28 | mitmproxy iptables Redirect | VM + cloud-init | `iptables REDIRECT` intercepts TCP 443 from `100.64.0.0/10` → mitmproxy port 8889. Persisted on boot. | ✅ Done — cloud-init + infra-dev.yml bootstrap updated |
| F-29 | mitmproxy CA Cert Portal Download | Portal | `/cert` page serves the mitmproxy CA cert with per-OS install instructions. | ✅ Done — portal /cert page + API /cert endpoint built |

---

### Post-MVP Features

| # | Feature | Component | Description | Priority |
|---|---|---|---|---|
| F-14 | Portal Authentication | Portal middleware | Supabase Auth — must do before production | 🔴 High |
| F-15 | Age Profiles (Strict/Moderate/Guided) | AdGuard + API | Per-device DNS blocklist profiles by age group | 🟡 Medium |
| F-16 | Custom Alert Rules | Portal + API | Parent sets per-device thresholds from portal | 🟡 Medium |
| F-17 | Grafana Provisioning | Grafana + InfluxDB | Pre-built dashboards: activity volume, risk trends, per-device | 🟡 Medium |
| F-18 | Node-RED Automation Flows | Node-RED | Pre-built flows ("2 hours gaming → send reminder") | 🟠 Low |
| F-19 | Screen Time Tracking | AdGuard + InfluxDB | Active time per platform per day, weekly trends | 🟡 Medium |
| F-20 | TikTok/Instagram Block | AdGuard | Platform-level DNS blocks (AdGuard default blocklist) | ✅ Done |
| F-21 | Console / Smart TV Support | AdGuard DNS | DNS-only monitoring for PlayStation, Xbox, Apple TV | 🟠 Low |
| F-22 | Multi-Child Support | Portal + Supabase | Multiple devices, multiple children, one parent account | 🟡 Medium |
| F-23 | Staging & Production Environments | IaC | Separate staging + prod with own Supabase and Cloudflare | 🔴 High |
| F-24 | Supabase Auth | Portal + Supabase | Replace anon access with real login (password + reset) | 🔴 High |
| F-25 | Auto GitHub Issue from CI Failures | GitHub Actions | Auto-open issues from failed QA runs, auto-close on pass | 🟡 Medium |
| F-30 | ntfy Admin in Portal | Portal + ntfy API | Create topics, view subscribers, test notifications from portal | 🟡 Medium — Phase 3 |
| F-31 | Grafana Embedded in Portal | Portal + Grafana | Admin section shows Grafana panels without leaving portal | 🟡 Medium — Phase 3 |
| F-32 | AdGuard Logs in Portal | Portal + AdGuard API | Real-time DNS query log per device, allow/block domains from portal | 🟡 Medium — Phase 3 |
| F-33 | Automated CA Cert Push | Portal + MDM | Silent cert delivery on device enrolment (iOS: `.mobileconfig`, Android: policy). Child cannot remove. | 🔴 High — before production |
| F-34 | Per-Device Headscale Management | Portal + Headscale API | Revoke device, rename, regenerate key — all from portal, no CLI | 🟡 Medium — Phase 3 |

---

## Phase 1 — Service Stabilisation ✅ Complete

All services healthy and configured. See phase history for details.

---

## Phase 2 — Device-Testable Application (IN PROGRESS)

**Goal:** Enrol one device, generate real traffic, see alerts end-to-end.
**Acceptance:** Parent receives ntfy alert after child opens YouTube. Alert visible in portal.

### 2a — Critical Infrastructure Gaps (Do These First)

These are blockers. Nothing in 2b works until all four are complete.

| # | Task | Feature | How | Acceptance | Status |
| --- | --- | --- | --- | --- | --- |
| 2a.1 | Fix AdGuard upstream DNS | F-01 | SSH port-forward → AdGuard admin UI → Settings → DNS Settings → add upstream: `8.8.8.8`, `1.1.1.1` | `nslookup google.com 172.20.0.2` resolves correctly | 🔲 **Next — manual step on VM** |
| 2a.2 | Configure Headscale DNS push | F-27 | Edit `apps/platform-config/headscale/headscale.yaml` → set `dns_config.nameservers: ["172.20.0.2"]` + `override_local_dns: true` → redeploy headscale container | Enrolled device automatically receives AdGuard as DNS — no manual device config | ✅ Done — IaC change applied in this session, will deploy via infra-dev.yml |
| 2a.3 | Add iptables redirect for mitmproxy | F-28 | Added to `cloud-init.yaml.tpl` AND `infra-dev.yml` bootstrap SSH block (idempotent, persisted via iptables-persistent) | `mitm.it` shows cert download page from enrolled device | ✅ Done — will apply on next infra-dev.yml run |
| 2a.4 | Add CA cert download page to portal | F-29 | Portal `/cert` page + API `/cert` endpoint + NavBar "Setup" link | Parent navigates to portal → Setup → downloads cert, installs as trusted root | ✅ Done — needs deploy to go live |

### 2b — Device Testing (Requires 2a Complete)

| # | Task | How | Acceptance | Status |
|---|---|---|---|---|
| 2.1 | Install Tailscale on test device | Tailscale app → login with preauth key from Phase 1 step 1.8 | Device appears in `headscale nodes list` | 🔲 Todo |
| 2.2 | Verify DNS auto-configured | Check device DNS settings after Tailscale connects | Device DNS points to `172.20.0.2`; `nslookup google.com` resolves | 🔲 Blocked on 2a.1 + 2a.2 |
| 2.3 | Install mitmproxy CA cert | Use portal `/cert` page (2a.4), install as trusted root per OS | HTTPS sites load without cert warning | 🔲 Blocked on 2a.3 + 2a.4 |
| 2.4 | Insert device record in Supabase | Via portal Devices page | `devices` table has entry for device | 🔲 Todo |
| 2.5 | Open YouTube on test device | Watch any video 10 seconds | `redis-cli LLEN familyshield:events > 0` | 🔲 Blocked on 2a.3 |
| 2.6 | Verify enrichment pipeline | Check API logs | `content_events` row in Supabase with title + risk_level | 🔲 Blocked on 2.5 |
| 2.7 | Verify ntfy alert on phone | Install ntfy app, subscribe to `familyshield-alerts` | High-risk content triggers notification within 30s | 🔲 Blocked on 2.6 |
| 2.8 | Verify portal shows activity | Open portal in browser | Dashboard shows event; Alerts page shows flagged items | 🔲 Blocked on 2.6 |

### 2c — Portal: Headscale API Integration (F-26, F-13)

| # | Task | Feature | How | Acceptance | Status |
| --- | --- | --- | --- | --- | --- |
| 2c.1 | Expose Headscale API via API service | F-26 | Add `HEADSCALE_API_KEY` secret; API service proxies Headscale gRPC/REST calls | Portal can list nodes and create preauth keys via API endpoint | 🔲 Todo |
| 2c.2 | Wire "Add Device" to Headscale | F-26 | Portal → Add Device → API calls `headscale preauthkeys create` → returns enrolment URL | Portal generates real key; no SSH needed | 🔲 Todo |
| 2c.3 | Auto-create device record on node join | F-13 | API polls Headscale nodes list (or webhook); creates `devices` row when new node appears | Device record created automatically | 🔲 Todo |

---

## Phase 3 — Portal as Admin Control Plane

**Goal:** All routine operations (device management, cert, ntfy, monitoring) done from portal. No CLI for parents.

| # | Task | Feature | Status |
|---|---|---|---|
| 3.1 | Portal authentication | F-14, F-24 | 🔲 Todo |
| 3.2 | ntfy admin in portal | F-30 | 🔲 Todo |
| 3.3 | Grafana provisioning (dashboards) | F-17 | 🔲 Todo |
| 3.4 | Grafana embedded in portal | F-31 | 🔲 Todo |
| 3.5 | AdGuard logs in portal | F-32 | 🔲 Todo |
| 3.6 | Per-device Headscale management | F-34 | 🔲 Todo |
| 3.7 | Age profile enforcement | F-15 | 🔲 Todo |
| 3.8 | Custom alert rules UI | F-16 | 🔲 Todo |
| 3.9 | Automated mitmproxy cert push | F-33 | 🔲 Todo |
| 3.10 | Multi-child support | F-22 | 🔲 Todo |

---

## Phase 4 — Production Readiness

**Goal:** Safe to run with real children. Prod environment deployed. Security hardened.

| # | Task | Notes | Status |
|---|---|---|---|
| 4.1 | Production Supabase project | Separate project for prod | 🔲 Todo |
| 4.2 | Production OCI environment | `infra-prod.yml` after dev proves stable | 🔲 Todo |
| 4.3 | Staging QA cycle | `qa` branch → Playwright E2E → teardown | 🔲 Todo |
| 4.4 | Security audit | CLAUDE.md Security Baseline full review | 🔲 Todo |
| 4.5 | Load test | k6 against portal + API | 🔲 Todo |
| 4.6 | Screen time tracking | F-19 — AdGuard + InfluxDB | 🔲 Todo |
| 4.7 | Node-RED automation flows | F-18 — pre-built flow library | 🔲 Todo |

---

## Open Questions & Decisions Needed

| # | Question | Context | Needed From |
|---|---|---|---|
| OQ-01 | One Headscale user per child, or one shared family user? | Per-child user gives cleaner per-node attribution. Shared user is simpler for MVP. | Mohit |
| OQ-02 | CA cert delivery mechanism for F-33? | iOS: `.mobileconfig` via MDM/email. Android: policy or manual. For MVP, manual portal download is fine. | Mohit |
| OQ-03 | Should iptables redirect apply to ALL VPN clients or only child-tagged nodes? | If parent device ever joins VPN, their traffic would also go through mitmproxy. Recommend: filter by Tailscale tag. | Mohit |
| OQ-04 | ntfy topic naming: one shared topic or per-child topic? | Per-child (`familyshield-jake`) allows alert filtering. Shared is simpler for MVP. | Mohit |

---

## Documentation Update Rules

**Every feature MUST update these docs before being marked done:**

| Feature Area | Docs to Update |
|---|---|
| New service or config | `docs/deployment-operations/README.md` + `docs/developer-guide/README.md` |
| New portal page or component | `docs/user-guide/README.md` |
| New device setup step | `docs/user-guide/README.md` |
| New alert type or risk category | `docs/user-guide/README.md` |
| New platform enricher | `docs/developer-guide/README.md` |
| New IaC resource or module | `docs/deployment-operations/README.md` |
| New workflow | `docs/developer-guide/README.md` |
| Security change | `CLAUDE.md` Security Baseline |
| Any breaking change | `CLAUDE.md` Known Issues + `docs/troubleshooting/README.md` |

---

## Supabase: Current State (Dev)

| Item | Status |
|---|---|
| `devices`, `content_events`, `alerts` tables | ✅ Created, RLS enabled |
| RLS policies (anon — dev MVP) | ✅ anon SELECT all + anon INSERT devices |
| Migration tracking | ⚠️ Applied manually |

---

## GitHub Secrets: Current State

| Secret | Status | Notes |
|---|---|---|
| `OCI_*` (5 secrets) | ✅ Set | |
| `OCI_SSH_PRIVATE_KEY` | ✅ Set | |
| `CLOUDFLARE_*` (3 secrets) | ✅ Set | |
| `SUPABASE_*` (3 secrets) | ✅ Set | |
| `GROQ_API_KEY` | ✅ Set | |
| `ANTHROPIC_API_KEY` | ✅ Set | |
| `YOUTUBE_API_KEY` | ✅ Set | |
| `TWITCH_CLIENT_ID` | 🔲 Missing | Parked |
| `TWITCH_CLIENT_SECRET` | 🔲 Missing | Parked |
| `DISCORD_BOT_TOKEN` | 🔲 Missing | Required for Discord enricher |

---

*FamilyShield · Everythingcloudsolutions · Canada · 2026*
*This document is the primary anchor for all active development. Keep it up to date.*
