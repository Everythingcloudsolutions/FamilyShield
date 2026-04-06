# /check-health — Check FamilyShield Service Health

Check the health of all 10 Docker containers on the OCI ARM VM.

## Steps

1. Ask which environment to check: dev / staging / prod
2. Get the VM IP from environment:
   - Run `cd iac && tofu output -json` to get `vm_public_ip` for the selected environment
   - Or use environment variable `OCI_VM_HOST` if set
3. SSH into the VM: `ssh -i ~/.ssh/familyshield ubuntu@{vm_ip}`
4. Run health checks in this order:

### Container status check
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep familyshield
```

### Resource usage
```bash
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" | grep familyshield
```

### Disk usage
```bash
df -h / && docker system df
```

### Recent errors (last 50 lines per container with errors)
For each container that is not "Up" or shows high resource usage, run:
```bash
docker logs --tail 50 {container_name}
```

## Expected healthy state

| Container | Expected Status | Port |
|---|---|---|
| familyshield-adguard | Up, healthy | 53, 3080 |
| familyshield-headscale | Up | 8080 |
| familyshield-mitmproxy | Up, healthy | 8888, 8889 |
| familyshield-redis | Up | 6379 |
| familyshield-api | Up, healthy | 3001 |
| familyshield-nodered | Up | 1880 |
| familyshield-influxdb | Up | 8086 |
| familyshield-grafana | Up | 3001 |
| familyshield-ntfy | Up | 2586 |
| familyshield-cloudflared | Up | (outbound only) |

## Application health checks
```bash
# API worker health endpoint (via cloudflared tunnel)
curl -s https://familyshield-{env}.everythingcloud.ca/api/health | jq .

# AdGuard DNS resolution check
dig @{vm_ip} youtube.com +short

# Redis queue depth
docker exec familyshield-redis redis-cli LLEN content_events
```

## Report format

Produce a clear health report with:
- Overall status: ✅ ALL HEALTHY / ⚠️ DEGRADED / ❌ CRITICAL
- Per-container table with status, uptime, CPU%, memory
- Any containers that are down or restarting — show last error
- Queue depth (should be < 100 in normal operation)
- Disk usage warning if > 80% full
- Recommended actions for any issues found

## Common issues and quick fixes

- Container keeps restarting → `docker logs {name}` to find the cause
- Redis queue building up → check API worker is running: `docker logs familyshield-api --tail 20`
- Cloudflared tunnel disconnected → `docker restart familyshield-cloudflared`
- AdGuard not resolving → check container logs, usually a config file permission issue
- Disk full → `docker image prune -a` to remove old images (always safe)
