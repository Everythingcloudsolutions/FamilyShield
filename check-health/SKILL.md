---
name: check-health
description: Check FamilyShield service health across dev and prod environments. Use this skill whenever the user asks to verify that FamilyShield services are running, check service status, monitor system health, verify deployments, or troubleshoot service availability. The skill checks all 11 backend services (Portal, API, AdGuard, Headscale, mitmproxy, Redis, InfluxDB, Grafana, Node-RED, ntfy, and Cloudflare Tunnel) in both dev and prod, reports status with actionable recommendations for any failures.
---

# FamilyShield Health Check Skill

## What This Skill Does

Checks the health of all FamilyShield backend services across dev and prod environments. For each service, it:

1. **Hits `/health` endpoints** (or falls back to HTTP 200 status)
2. **Checks response time** and logs any latency issues
3. **Validates internal services** (Redis, InfluxDB) via Cloudflare SSH tunnel
4. **Generates a detailed report** with:
   - Service name, status (✅ healthy, ⚠️ degraded, ❌ unhealthy)
   - Response time and last check timestamp
   - **Actionable recommendations** for any failures

## When to Use

- "Check FamilyShield health"
- "Is the dev environment healthy?"
- "Verify prod services are running"
- "Service is slow — check health"
- "Troubleshoot why the portal isn't responding"
- "Do a health check before deploying"

## Services Checked

| Service | Type | Health Check | Status Indicator |
|---------|------|--------------|------------------|
| **Portal** | Frontend | GET `https://familyshield-{env}.everythingcloud.ca/` → HTTP 200 | Homepage loads |
| **API** | Backend | GET `https://api-{env}.everythingcloud.ca/health` → JSON `{status: "ok"}` | Enrichment worker ready |
| **AdGuard Home** | DNS | GET `https://adguard-{env}.everythingcloud.ca/` → HTTP 200 | Admin UI responds |
| **Headscale** | VPN | GET `https://vpn.familyshield-{env}.everythingcloud.ca/` → HTTP 200 | Control plane reachable |
| **mitmproxy** | Proxy | GET `https://mitmproxy-{env}.everythingcloud.ca/` → HTTP 200 | Web UI responds |
| **Redis** | Queue | `docker exec familyshield-redis redis-cli ping` → `PONG` | Event queue ready |
| **InfluxDB** | Metrics | `docker exec familyshield-influxdb influx ping` → `OK` | Time-series DB ready |
| **Grafana** | Dashboards | GET `https://grafana-{env}.everythingcloud.ca/api/health` → JSON `{status: "ok"}` | Admin dashboard ready |
| **Node-RED** | Automations | GET `https://nodered-{env}.everythingcloud.ca/` → HTTP 200 | Rules engine running |
| **ntfy** | Notifications | GET `https://notify-{env}.everythingcloud.ca/` → HTTP 200 | Notification server running |
| **Cloudflare Tunnel** | Networking | Verify HTTPS tunnel is active and routing | Tunnel daemon responding |

## How It Works

### Step 1: HTTPS Checks (Direct from Claude)

For all public-facing services, the skill makes HTTP requests:

```bash
curl -s -w "\nHTTP %{http_code}\nTime: %{time_total}s\n" \
  https://api-dev.everythingcloud.ca/health
```

Results are parsed for:
- HTTP status code (200 = healthy, anything else = degraded/unhealthy)
- Response time (>5s = slow)
- Response body (for services with `/health` endpoints)

### Step 2: Internal Service Checks (via GitHub Actions)

Redis and InfluxDB are not HTTPS-exposed. To check them, the skill:

1. **Triggers GitHub Actions workflow** `check-health-internal.yml` with parameters:
   - Environment: `dev` or `prod`
   - GitHub token: (already available in Actions context)

2. **Workflow runs SSH commands** via Cloudflare tunnel with service token credentials:
   
   For dev:
   ```bash
   SSH_HOST="ssh-dev.everythingcloud.ca"
   CF_ACCESS_CLIENT_ID="..." # from GitHub secrets
   CF_ACCESS_CLIENT_SECRET="..." # from GitHub secrets
   
   ssh -i ~/.ssh/familyshield \
     -o StrictHostKeyChecking=no \
     -o UserKnownHostsFile=/dev/null \
     -o ProxyCommand="cloudflared access ssh --hostname $SSH_HOST --service-token-id $CF_ACCESS_CLIENT_ID --service-token-secret $CF_ACCESS_CLIENT_SECRET" \
     ubuntu@$SSH_HOST \
     "docker exec familyshield-redis redis-cli ping"
   ```
   
   For prod: Same command, but with `SSH_HOST="ssh-prod.everythingcloud.ca"`

3. **Skill polls for results** (GitHub API) or reads action output

### Step 3: Report Generation

The skill generates a markdown report with:

```markdown
# FamilyShield Health Report — Dev & Prod
Generated: 2026-04-17 14:23:45 UTC

## Environment: DEV

### ✅ Healthy Services (9/11)
| Service | Response Time | Last Check |
|---------|---------------|------------|
| Portal | 245ms | 14:23:40 |
| API | 180ms | 14:23:41 |
| ... |

### ⚠️ Degraded Services (1/11)
| Service | Issue | Response Time |
|---------|-------|----------------|
| Grafana | Slow response | 8.2s | 

**Recommendation:** Check Grafana logs — likely InfluxDB query timeout. Run:
```bash
SSH_HOST="ssh-dev.everythingcloud.ca"
ssh -o ProxyCommand="cloudflared access ssh --hostname $SSH_HOST --service-token-id $CF_ACCESS_CLIENT_ID --service-token-secret $CF_ACCESS_CLIENT_SECRET" \
  ubuntu@$SSH_HOST \
  "docker logs familyshield-grafana --tail 20"
```

### ❌ Unhealthy Services (1/11)
| Service | Status | Error |
|---------|--------|-------|
| Redis | DOWN | Connection timeout (60s) |

**Recommendation:** Restart Redis container:
```bash
SSH_HOST="ssh-dev.everythingcloud.ca"
ssh -o ProxyCommand="cloudflared access ssh --hostname $SSH_HOST --service-token-id $CF_ACCESS_CLIENT_ID --service-token-secret $CF_ACCESS_CLIENT_SECRET" \
  ubuntu@$SSH_HOST \
  "docker restart familyshield-redis && docker exec familyshield-redis redis-cli info stats"
```

## Environment: PROD

[same format]

## Summary

- **Dev:** 9/11 healthy (1 degraded, 1 down)
- **Prod:** 11/11 healthy ✓
- **Action Required:** Yes — restart Redis in dev

---
```

## What the User Sees

1. **Quick Status:** "✅ Dev: 10/11 healthy | ⚠️ Prod: 11/11 healthy"
2. **Detailed Report:** Full table with response times + error details
3. **Actionable Steps:** For each issue, exact commands to run or Slack channels to ping

## User Input (Optional)

The skill can accept:

- **Environment:** `dev` only, `prod` only, or both (default: both)
  - Example: "Check health for prod only"

- **Verbose mode:** Show all response payloads (default: off)
  - Example: "Check health with full output"

## Dependencies

- GitHub Actions workflow: `.github/workflows/check-health-internal.yml` (must be created)
- GitHub token: `GITHUB_TOKEN` (auto-available in Actions, passed to skill)
- Cloudflare tunnel credentials: Already set up in IaC

## Limitations & Notes

- **Redis/InfluxDB checks require SSH:** These depend on GitHub Actions having active Cloudflare tunnel connectivity
- **Timeout:** HTTPS checks have 10s timeout per service; internal checks (workflow) timeout at 30s total
- **Rate limiting:** If checking prod, expect ~30-40s runtime (11 sequential HTTP requests + 1 workflow run)
- **Grafana:** Has no `/health` endpoint in docker-compose — checks HTTP 200 on root path

## Example Invocations

```
"Check FamilyShield health"
→ Checks both dev & prod, returns summary + detailed report

"Is prod healthy?"
→ Checks prod only, quick summary

"Full health check dev with details"
→ Dev only, verbose output with all response payloads

"Health check and tell me what to fix"
→ Both environments, actionable recommendations only
```
