# Health Status Badge Template for README.md

This template shows how to add the health status badge and link to the detailed report in the main `README.md`.

---

## Option 1: Simple Badge (Recommended)

Add this section near the top of README.md (after project intro):

```markdown
## 🏥 Service Health

![Health Status](https://img.shields.io/badge/status-all%20healthy-brightgreen?style=flat-square)

**Last checked:** [View detailed report](./HEALTH_STATUS.md)

- ✅ Dev: All services operational
- ✅ Prod: All services operational
```

---

## Option 2: Expandable Summary

```markdown
## 🏥 Service Health

<details open>
<summary>

![Health Status](https://img.shields.io/badge/status-all%20healthy-brightgreen?style=flat-square) · Last updated: 2026-04-17 14:30 UTC

</summary>

**Dev Environment:**
- ✅ Portal
- ✅ API  
- ✅ AdGuard
- ✅ Headscale
- ✅ mitmproxy
- ✅ Redis
- ✅ InfluxDB
- ✅ Grafana
- ✅ Node-RED
- ✅ ntfy

**Prod Environment:**
- ✅ All 10 services healthy

[View full details →](./HEALTH_STATUS.md)

</details>
```

---

## Option 3: Status Badges Per Environment

```markdown
## 🏥 Service Health

| Environment | Status |
|-------------|--------|
| **Dev** | ![Dev Status](https://img.shields.io/badge/dev-operational-brightgreen?style=flat) |
| **Prod** | ![Prod Status](https://img.shields.io/badge/prod-operational-brightgreen?style=flat) |

[📋 View detailed health report →](./HEALTH_STATUS.md)
```

---

## Badge Status Colors

Use these colors in the badge based on health status:

```
✅ All Healthy    → brightgreen
⚠️ Some Degraded  → yellow
❌ Some Down      → red
🔄 Checking       → blue
```

Example badges:

```markdown
![Health](https://img.shields.io/badge/status-all%20healthy-brightgreen?style=flat-square)
![Health](https://img.shields.io/badge/status-2%20services%20slow-yellow?style=flat-square)
![Health](https://img.shields.io/badge/status-1%20service%20down-red?style=flat-square)
```

---

## File Organization

After running health checks, you'll have:

```
README.md
├── 🏥 Service Health (badge + summary)
└── → links to HEALTH_STATUS.md

HEALTH_STATUS.md
├── Generated timestamp
├── ## Environment: dev
│   └── | Service | Status | Response Time |
├── ## Environment: prod
│   └── | Service | Status | Response Time |
└── ## Summary
```

---

## Automation Note

**For now (development phase):**
- Health checks are **manual** — user runs `check-health` skill or GitHub Actions workflow
- README badge is **updated manually** after each check
- Detailed report is saved to `HEALTH_STATUS.md` (in `.gitignore` if you prefer, or committed for history)

**Later (when ready for scheduled automation):**
- `.github/workflows/scheduled-health-check.yml` will run every 30 minutes
- Badge + summary in README will auto-update
- Full markdown report in `HEALTH_STATUS.md` will be committed with history
