# FamilyShield — MVP Plan, Feature List & Development Roadmap

> Last updated: 2026-04-17
> Audience: Developer (Mohit) + Claude Code — this is the anchor document for all active development
> Status tracker: See Phase checklists below. Update this file as items are completed.
> **Current phase:** Phase 2 — Device-Testable Application (steps 2.1–2.8)

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

1. Enrol a child's device into FamilyShield
2. See a live feed of what the child is watching or playing (YouTube, Roblox, Twitch, Discord)
3. Receive a push notification on their phone when the AI flags high-risk content
4. View the activity history and alerts in the parent portal

The child experiences:

- Normal internet access (DNS filtering is transparent for allowed content)
- Blocked access to TikTok and other DNS-blocked platforms
- HTTPS traffic intercepted for content ID extraction only (no content stored)

---

## System Architecture Recap (For Context)

```
Child Device
  │
  ├─ Tailscale/Headscale VPN → all traffic routed through OCI VM
  │
OCI ARM VM (ca-toronto-1)
  ├─ AdGuard Home      ← DNS filtering, per-device profiles, blocklists
  ├─ mitmproxy         ← SSL interception, extracts content IDs only
  ├─ Redis             ← event queue between mitmproxy and API worker
  ├─ API Worker        ← enriches content IDs via platform APIs + AI risk scoring
  ├─ ntfy              ← push notification delivery to parent phone
  ├─ Supabase          ← stores events, alerts, devices (hosted, not on VM)
  ├─ Portal (Next.js)  ← parent dashboard, viewed via browser
  ├─ Grafana           ← time-series dashboards (post-MVP)
  ├─ Node-RED          ← automation flows (post-MVP)
  └─ InfluxDB          ← metrics storage (post-MVP)
```

---

## Complete Feature List

### MVP Features (Required to Call It Working)

| # | Feature | Component | New User Description | Status |
|---|---|---|---|---|
| F-01 | DNS Filtering | AdGuard | Automatically blocks known adult, gambling, and malware domains for every device on the VPN. No configuration needed per-device. | 🔲 Needs AdGuard initial setup |
| F-02 | Child Device Enrolment | Headscale + Tailscale | Parent installs Tailscale app on child's device, enters a one-time key, and the device joins FamilyShield's private network. Takes 5 minutes. | 🔲 Needs Headscale user + key |
| F-03 | HTTPS Traffic Inspection | mitmproxy | After installing a trust certificate on the child's device, FamilyShield can see the content IDs of videos, games, and channels the child accesses. No content is recorded — only identifiers. | 🔲 Needs CA cert on device |
| F-04 | YouTube Activity Monitoring | API + mitmproxy | When a child watches a YouTube video, FamilyShield looks up the video title and description and AI-scores it for risk. | ✅ Code complete |
| F-05 | Roblox Activity Monitoring | API + mitmproxy | When a child plays a Roblox game, FamilyShield looks up the game name and player count and AI-scores it. | ✅ Code complete |
| F-06 | Twitch Activity Monitoring | API + mitmproxy | When a child watches a Twitch stream, FamilyShield looks up the channel name and mature content flag. | ✅ Code complete |
| F-07 | Discord Activity Monitoring | API + mitmproxy | When a child accesses a Discord server or channel, FamilyShield logs the server and flags NSFW-enabled servers. | ✅ Code complete |
| F-08 | AI Risk Scoring | API (Groq + Anthropic) | Each piece of content is scored by AI across 8 risk categories: violence, adult, gambling, drugs, hate speech, predatory, gaming, educational. Score: low / medium / high / critical. | ✅ Code complete |
| F-09 | Push Notifications | ntfy | When a high or critical risk event is detected, parent receives an instant push notification on their phone via the ntfy app. | 🔲 Needs ntfy user + topic setup |
| F-10 | Parent Portal — Activity Feed | Portal + Supabase | Parent logs into the web portal and sees a real-time feed of everything their child has accessed, colour-coded by risk level. | ✅ Code complete, Supabase ✅ |
| F-11 | Parent Portal — Alerts Page | Portal + Supabase | Parent can view all flagged alerts, filter by device, risk level, or date, and see which alerts have been dispatched via ntfy. | ✅ Code complete |
| F-12 | Parent Portal — Devices Page | Portal + Supabase | Parent can see which devices are enrolled, their profile (strict/moderate/guided), and when they were last seen. | ✅ Code complete |
| F-13 | Device Enrolment Record | Supabase | When a device is enrolled, a record is created in the `devices` table linking the device IP to the parent's account and profile. | 🔲 Needs manual insert for first device |

---

### Post-MVP Features (After First Device Test)

| # | Feature | Component | Description | Priority |
|---|---|---|---|---|
| F-14 | Portal Authentication | Portal middleware | Basic auth or Supabase Auth protecting the portal so only the parent can log in | 🔴 High — must do before production |
| F-15 | Age Profiles (Strict/Moderate/Guided) | AdGuard + API | Per-device DNS blocklist profiles matched to child's age group. Strict (6-10): blocks all social. Moderate (11-14): blocks adult only. Guided (15-17): logs only. | 🟡 Medium |
| F-16 | Custom Alert Rules | Portal + API | Parent can set custom rules: "alert me for all gaming content", "ignore YouTube educational". UI to configure thresholds per device. | 🟡 Medium |
| F-17 | Grafana Dashboards | Grafana + InfluxDB | Time-series dashboards showing activity volume, risk trends, top platforms, and busiest times of day. | 🟡 Medium |
| F-18 | Node-RED Automation Flows | Node-RED | Automation: "if child has had 2 hours of gaming today, send a reminder". Pre-built flows for common parenting scenarios. | 🟠 Low |
| F-19 | Screen Time Tracking | AdGuard + InfluxDB | Track how long a device is active on each platform per day. View weekly trends in portal. | 🟡 Medium |
| F-20 | TikTok/Instagram Block | AdGuard | Platform-level DNS blocks for TikTok (cert-pinned, cannot inspect) and Instagram (optional). Already in default blocklist. | ✅ AdGuard blocklist handles this |
| F-21 | Console / Smart TV Support | AdGuard DNS | Route DNS from PlayStation, Xbox, Apple TV through AdGuard. No SSL inspection possible — DNS-only monitoring. | 🟠 Low |
| F-22 | Multi-Child Support | Portal + Supabase | Support multiple devices mapped to multiple children from one parent account. Profile per device. | 🟡 Medium |
| F-23 | Staging & Production Environments | IaC | Separate staging (ephemeral QA) and production environments with own Supabase projects and Cloudflare tunnels. | 🔴 High — needed before family use |
| F-24 | Supabase Authentication | Portal + Supabase | Replace basic auth scaffold with proper Supabase Auth so parent has a real login with password reset. | 🔴 High — before production |
| F-25 | Auto GitHub Issue Creation from CI Failures | GitHub Actions | When a scheduled QA run (qa-e2e.yml) or PR check fails, automatically open a GitHub Issue tagged with the workflow name, failure summary, and run URL. Issues are de-duped so the same failure doesn't create multiple open issues. Closed automatically when the next run passes. | 🟡 Medium — improves observability |

---

## Phase 1 — Service Stabilisation

**Goal:** All 10 services healthy, configured, and talking to each other.
**Acceptance:** `docker compose ps` on VM shows all services `Up (healthy)`.

| # | Task | How | Acceptance | Status |
|---|---|---|---|---|
| 1.1 | Apply Supabase migration | ✅ Tables exist in dev project | `devices`, `content_events`, `alerts` present with RLS | ✅ Done |
| 1.2 | Fix Supabase function search_path | Apply patch migration via MCP | No security warnings in advisor | ✅ Done |
| 1.3 | Set missing GitHub Secrets | GitHub → Settings → Secrets | `YOUTUBE_API_KEY`, `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` added | 🔲 Partial — `YOUTUBE_API_KEY` ✅, `TWITCH_CLIENT_ID` + `TWITCH_CLIENT_SECRET` 🔲 Todo (needs Mohit) |
| 1.4 | Fix ntfy base-url placeholder | Edit `apps/platform-config/ntfy/server.yml` | URL matches `notify-dev.everythingcloud.ca` | ✅ Done |
| 1.5 | Add Cloudflare Access email policies + tunnel routes | `iac/cloudflare/access.tf` — add email Allow policies for AdGuard, Grafana, SSH | `mohit.goyal@everything.net.in` can browse admin services; ntfy route added | ✅ Done |
| 1.5a | Fix container healthchecks | `iac/templates/docker-compose.yaml.tpl` — portal (IPv4 fix), headscale (no wget), mitmproxy (python3) | Portal ✅ healthy; headscale ✅ healthy; mitmproxy ✅ healthy (after re-run) | ✅ Done |
| 1.5b | Fix INFLUXDB_ADMIN_TOKEN secret name | `infra-dev.yml` + `infra-prod.yml` — secret ref was INFLUXDB_ADMIN_TOKEN, should be TF_VAR_INFLUXDB_ADMIN_TOKEN | Workflow passes tofu apply without missing-secret error | ✅ Done |
| 1.6 | Add Grafana datasource provisioning | Add config to `apps/platform-config/grafana/provisioning/` | Grafana starts with InfluxDB datasource pre-configured | ✅ Done |
| 1.7 | AdGuard initial setup | SSH port-forward to container IP: `ssh -L 3000:172.20.0.2:3000 -i ~/.ssh/familyshield ubuntu@<vm-ip> -N` → open `http://localhost:3000` → set Admin port=80 | Admin UI accessible via `adguard-dev.everythingcloud.ca`, default blocklists active | ✅ Done |
| 1.8 | Headscale: create user + preauth key | `docker exec familyshield-headscale headscale users create parent` then get user ID via `users list` and run `preauthkeys create --user <id>` | User created, preauth key generated and saved | ✅ Done |
| 1.9 | ntfy: create parent user + alert topic | `docker exec -it familyshield-ntfy ntfy user add parent` (must use `-it` for password prompt) then `ntfy access parent familyshield-alerts rw` | Parent user created, `familyshield-alerts` topic accessible | ✅ Done |
| 1.10 | Verify all services healthy | SSH → `docker compose ps` | All 10 services: `Up (healthy)` | ✅ Done (VM 40.233.115.22) |

> 📖 **Step 1.7 reference docs:** [Developer Guide — AdGuard Setup](developer-guide/README.md#112-adguard-home-dns-filtering) | [Troubleshoot AdGuard](troubleshooting/README.md#adguard-home-issues)
>
> **Step 1.7 note — AdGuard first-time setup via SSH port-forward:**
> The Cloudflare tunnel routes `adguard-dev.everythingcloud.ca` → VM host:3080 → container:80.
> AdGuard's setup wizard runs on container:3000 (not mapped to host), so the tunnel can't reach it until setup is done.
> Container port 3000 is NOT exposed to the host — forward directly to the container IP on the bridge network:
> ```bash
> ssh -L 3000:172.20.0.2:3000 -i ~/.ssh/familyshield ubuntu@<vm-ip> -N
> ```
> Leave that terminal open (the `-N` flag means no shell, just forwarding). Then open `http://localhost:3000`.
> In the wizard:
> - **Admin Web Interface** → port **80** (MUST be 80, not 3000 — so tunnel works after setup)
> - **DNS** → port **53** (already mapped)
> After completing setup, port 3000 wizard disappears (Connection refused = setup is done). AdGuard serves on
> port 80. The Cloudflare tunnel and healthcheck now both work.
>
> 📖 **Step 1.8 reference docs:** [Developer Guide — Headscale Setup](developer-guide/README.md#111-headscale-vpn-server) | [Troubleshoot Tailscale/Headscale](troubleshooting/README.md#headscale--tailscale-vpn-issues)
>
> **Step 1.8 note — Headscale `--user` flag takes numeric ID, not username:**
> As of recent headscale versions, `--user` requires the numeric user ID from `headscale users list`, not the name:
> ```bash
> docker exec familyshield-headscale headscale users create parent
> docker exec familyshield-headscale headscale users list
> # Note the ID column (e.g. 1)
> docker exec familyshield-headscale headscale preauthkeys create --user 1 --reusable --expiration 8760h
> ```
>
> 📖 **Step 1.9 reference docs:** [Developer Guide — ntfy Setup](developer-guide/README.md#114-ntfy-push-notifications) | [Troubleshoot ntfy](troubleshooting/README.md#issue-ntfy-not-sending-alerts)
>
> **Step 1.9 note — ntfy `user add` requires interactive TTY:**
> Running `docker exec familyshield-ntfy ntfy user add parent` without `-it` fails with
> `password: inappropriate ioctl for device`. Always use `-it`:
> ```bash
> docker exec -it familyshield-ntfy ntfy user add parent
> docker exec familyshield-ntfy ntfy access parent familyshield-alerts rw
> ```

---

## Phase 2 — Device-Testable Application

**Goal:** Enrol one device, generate real traffic, see alerts end-to-end.
**Acceptance:** Parent receives ntfy alert after child opens YouTube. Alert visible in portal.

| # | Task | How | Acceptance | Status |
|---|---|---|---|---|
| 2.1 | Install Tailscale on test device | Install Tailscale app → login with preauth key from step 1.8 — 📖 [Parent Guide — Step 3](user-guide/README.md#43-step-3-connect-childs-device-to-familyshield-3-minutes) | [Headscale setup](developer-guide/README.md#111-headscale-vpn-server) | Device appears in `headscale nodes list` | 🔲 Todo (needs Mohit) |
| 2.2 | Install mitmproxy CA cert on test device | Download cert from `http://mitm.it` while on VPN → install as trusted root — 📖 [Parent Guide — Step 4](user-guide/README.md#46-step-4-install-the-safety-certificate-3-minutes) | [mitmproxy setup](developer-guide/README.md#113-mitmproxy-https-inspection) | HTTPS sites load without cert warning | 🔲 Todo (needs Mohit) |
| 2.3 | Route device DNS to AdGuard | Set DNS server to `172.20.0.2` (AdGuard IP) in Tailscale subnet — 📖 [AdGuard setup](developer-guide/README.md#112-adguard-home-dns-filtering) | [Headscale DNS push](developer-guide/README.md#111-headscale-vpn-server) | `nslookup google.com` resolves via AdGuard | 🔲 Todo (needs Mohit) |
| 2.4 | Insert device record in Supabase | Via portal Devices page (anon INSERT policy now ✅) | `devices` table has entry for device IP | 🔲 Todo |
| 2.5 | Open YouTube on test device | Watch any video for 10 seconds | Redis queue receives event (`redis-cli LLEN familyshield:events > 0`) | 🔲 Todo |
| 2.6 | Verify enrichment pipeline | Check API logs | `content_events` row in Supabase with title + risk_level filled | 🔲 Todo |
| 2.7 | Verify alert on phone | Install ntfy app on parent phone, subscribe to topic | High-risk content triggers ntfy notification within 30s | 🔲 Todo |
| 2.8 | Verify portal shows activity | Open portal in browser | Dashboard shows event, Alerts page shows flagged items | 🔲 Todo |

> **Pre-work completed (2026-04-17):**
> - Supabase anon SELECT policies added for `devices`, `content_events`, `alerts` — portal can now read data without auth
> - Supabase anon INSERT policy added for `devices` — portal can enroll devices without auth (dev-only, replaced by F-14 in prod)
> - `DISCORD_BOT_TOKEN` added to docker-compose template; deploy now writes API secrets to `/opt/familyshield/.env`
> - **Missing GitHub Secrets needed before 2.5:** `DISCORD_BOT_TOKEN` — add at github.com/Everythingcloudsolutions/FamilyShield/settings/secrets/actions

---

## Phase 3 — Production Readiness

**Goal:** Safe to run with real children. Portal has auth. Prod environment deployed.

| # | Task | Notes | Status |
|---|---|---|---|
| 3.1 | Portal authentication (F-14) | Supabase Auth or basic auth enabled before production | 🔲 Todo |
| 3.2 | Production Supabase project | Separate Supabase project for prod (not sharing dev schema) | 🔲 Todo |
| 3.3 | Production OCI environment | Run `infra-prod.yml` after dev proves stable | 🔲 Todo |
| 3.4 | Staging QA cycle | Push to `qa` branch, run Playwright E2E, teardown | 🔲 Todo |
| 3.5 | Age profile enforcement (F-15) | AdGuard profile API integration | 🔲 Todo |
| 3.6 | Alert rules UI (F-16) | Custom thresholds per device in portal | 🔲 Todo |
| 3.7 | Grafana dashboards (F-17) | Provision InfluxDB + pre-built dashboard JSON | 🔲 Todo |
| 3.8 | Security audit | Review all CLAUDE.md Security Baseline items | 🔲 Todo |
| 3.9 | Load test | Playwright + k6 against portal, API under simulated device traffic | 🔲 Todo |

---

## Documentation Update Rules

**Every feature MUST update these docs before being marked done:**

| Feature Area | Docs to Update |
|---|---|
| New service or config | `docs/deployment-operations/README.md` + `docs/developer-guide/README.md` |
| New portal page or component | `docs/user-guide/README.md` (how parent uses it) |
| New device setup step | `docs/user-guide/README.md` (device enrolment section) |
| New alert type or risk category | `docs/user-guide/README.md` (understanding alerts section) |
| New platform enricher | `docs/developer-guide/README.md` (Working with Each Service) |
| New IaC resource or module | `docs/deployment-operations/README.md` |
| New workflow | `docs/developer-guide/README.md` (Workflow Decision Matrix) |
| Security change | `CLAUDE.md` (Security Baseline section) |
| Any breaking change | `CLAUDE.md` (Known Issues) + `docs/troubleshooting/README.md` |

**Docs that must always stay current:**

- `docs/user-guide/README.md` — parent-facing, non-technical language, updated with every user-visible feature
- `docs/developer-guide/README.md` — developer onboarding, updated with every new service or workflow
- `docs/deployment-operations/README.md` — ops runbook, updated with every infra or config change
- `CLAUDE.md` — Claude Code anchor, updated with every architectural decision or build status change

---

## User Guide: How Each MVP Feature Works (New Parent Perspective)

### Setting Up FamilyShield (First Time)

> **Time required:** About 45 minutes for the full setup.

1. **You receive an invite link** from FamilyShield setup (or your administrator). Click it to create your parent account.
2. **You see the portal** at `https://familyshield-dev.everythingcloud.ca`. The dashboard is empty — no devices enrolled yet.
3. **You proceed to "Enrol a Device"** — see the device enrolment guide below.

---

### F-02: Enrolling a Child's Device

**What it does:** Connects the child's phone, tablet, or laptop to FamilyShield's private network so all their internet traffic passes through the filtering system.

**Step-by-step (from parent's perspective):**

1. On your child's device, go to the App Store or Google Play and install **Tailscale**
2. In the FamilyShield portal, go to **Devices → Add Device → Generate Key**
3. Copy the one-time key shown on screen (it expires in 24 hours)
4. On your child's device, open Tailscale → **Sign in with auth key** → paste the key
5. The device appears in your portal under **Devices** within 30 seconds
6. Set the profile: **Strict** (age 6-10), **Moderate** (age 11-14), or **Guided** (age 15-17)
7. The device is now protected — DNS filtering and content monitoring are active

**What the child sees:** A Tailscale VPN icon in their status bar. They can see it is connected. FamilyShield is transparent about monitoring being active.

---

### F-01: DNS Filtering

**What it does:** Automatically blocks known harmful websites before they can load. Works without any configuration — blocklists are pre-loaded.

**Default blocks include:**

- Adult content sites
- Gambling sites
- Known malware and phishing domains
- TikTok (cert-pinned, cannot inspect — blocked at DNS level)

**What the child sees:** Blocked sites show a "This site can't be reached" page. Nothing mentions FamilyShield — it just doesn't load.

**What the parent sees:** In the portal, blocked DNS requests appear as "DNS block" events in the activity feed.

---

### F-03: HTTPS Content Inspection

**What it does:** After installing a security certificate on the child's device, FamilyShield can identify *what* the child is accessing (video titles, game names) without recording the actual content.

**One-time setup (parent does this once per device):**

1. On the child's device (while connected to FamilyShield VPN), open a browser and go to `http://mitm.it`
2. Download and install the certificate for your device type (iOS / Android / Windows / Mac)
3. On iOS: go to Settings → General → About → Certificate Trust Settings → enable FamilyShield certificate
4. On Android: go to Settings → Security → Install certificate → select the downloaded file

**Privacy note:** FamilyShield extracts only content identifiers (e.g. a YouTube video ID like `dQw4w9WgXcQ`). It never records video content, chat messages, or passwords.

---

### F-04–F-07: Platform Monitoring (YouTube, Roblox, Twitch, Discord)

**What it does:** When your child accesses these platforms, FamilyShield looks up what they're watching or playing and checks it for age-appropriateness.

**What you see in the portal:**

| Platform | What's Shown |
|---|---|
| YouTube | Video title, channel, category, risk score |
| Roblox | Game name, player count, genre, risk score |
| Twitch | Channel name, mature content flag, risk score |
| Discord | Server name, NSFW flag, risk score |

**How quickly:** Events appear in the portal within 5–10 seconds of the child accessing the content.

---

### F-08: AI Risk Scoring

**What it does:** Every piece of content is analysed by AI and scored across 8 risk categories.

**Risk categories:**

- Violence, Adult Content, Gambling, Drugs/Alcohol
- Hate Speech, Predatory Behaviour, Gaming (excessive), Educational (positive)

**Risk levels:**

- 🟢 **Low** — age-appropriate, no action
- 🟡 **Medium** — logged, no alert sent
- 🔴 **High** — alert sent to parent via ntfy
- 🚨 **Critical** — urgent alert sent immediately

---

### F-09: Push Notifications (ntfy)

**What it does:** When a high or critical risk event is detected, you receive an instant notification on your phone.

**Setup (one time):**

1. Install the **ntfy** app on your phone ([iOS](https://apps.apple.com/app/ntfy/id1625396347) / [Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy))
2. In the ntfy app, tap **Subscribe to topic**
3. Enter server: `https://notify-dev.everythingcloud.ca`
4. Enter topic: `familyshield-alerts` (your personal topic — keep this private)
5. Done. Alerts arrive as push notifications with the content title and risk level.

**Example alert:**

```
🚨 FamilyShield Alert
Device: Jake's iPad
Platform: YouTube
Content: [Video Title] — Risk: Critical
Categories: Adult Content, Violence
```

---

### F-10–F-12: Parent Portal

**What it does:** A web dashboard where you can see everything about your children's online activity.

**Accessing the portal:**

- Dev: `https://familyshield-dev.everythingcloud.ca`
- Prod: `https://familyshield.everythingcloud.ca`

**Dashboard (home page):**

- Live feed of recent content events across all devices
- Risk level badges (colour-coded)
- Platform icons for quick identification
- Updates in real-time via Supabase Realtime WebSocket

**Alerts page:**

- All flagged events (medium, high, critical)
- Filter by device, platform, risk level, date range
- Each alert shows: content title, risk categories, AI confidence score, whether ntfy notification was sent

**Devices page:**

- All enrolled devices
- Device name, profile, last seen timestamp
- Enrol new device button (generates a Tailscale preauth key)

---

## Supabase: Current State (Dev Environment)

| Item | Status |
|---|---|
| Project | `familyshield-dev` (ca-central-1) |
| Status | `ACTIVE_HEALTHY` |
| `devices` table | ✅ Created, RLS enabled, 0 rows |
| `content_events` table | ✅ Created, RLS enabled, 0 rows |
| `alerts` table | ✅ Created, RLS enabled, 0 rows |
| RLS policies (authenticated) | ✅ Default-deny + parent_user_id scoped for all CRUD |
| RLS policies (anon — dev MVP) | ✅ anon SELECT on all 3 tables + anon INSERT on devices (removed before prod, replaced by F-14 auth) |
| Security warning | ✅ Fixed — `set_updated_at_timestamp` search_path patched |
| Migration tracking | ⚠️ Applied manually — not tracked in Supabase migrations table |

---

## GitHub Secrets: Current State

| Secret | Status | Notes |
|---|---|---|
| `OCI_TENANCY_OCID` | ✅ Set | |
| `OCI_USER_OCID` | ✅ Set | |
| `OCI_FINGERPRINT` | ✅ Set | |
| `OCI_PRIVATE_KEY` | ✅ Set | |
| `OCI_NAMESPACE` | ✅ Set | |
| `OCI_SSH_PRIVATE_KEY` | ✅ Set | |
| `CLOUDFLARE_API_TOKEN` | ✅ Set | |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ Set | |
| `CLOUDFLARE_ZONE_ID` | ✅ Set | |
| `SUPABASE_URL` | ✅ Set | |
| `SUPABASE_ANON_KEY` | ✅ Set | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Set | |
| `GROQ_API_KEY` | ✅ Set | |
| `ANTHROPIC_API_KEY` | ✅ Set | |
| `YOUTUBE_API_KEY` | ✅ Set | Required for YouTube enricher |
| `TWITCH_CLIENT_ID` | 🔲 Missing | Required for Twitch enricher (parked — not urgent) |
| `TWITCH_CLIENT_SECRET` | 🔲 Missing | Required for Twitch enricher (parked — not urgent) |
| `DISCORD_BOT_TOKEN` | 🔲 Missing | Required for Discord enricher — get from discord.com/developers |

---

*FamilyShield · Everythingcloudsolutions · Canada · 2026*
*This document is the primary anchor for all active development. Keep it up to date.*
