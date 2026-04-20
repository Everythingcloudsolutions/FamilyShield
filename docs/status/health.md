# FamilyShield — Service Health Status

> Updated by the [Health Check](../../.github/workflows/scheduled-health-check.yml) workflow (manual trigger).
> Run it from GitHub Actions → Health Check → Run workflow.

---

## Dev Environment

**Last checked:** 2026-04-19 11:39:43 UTC

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

---

## Prod Environment

**Last checked:** 2026-04-19 11:39:43 UTC

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
