# FamilyShield Cloud Agent

Autonomous DevOps agent for monitoring and managing the FamilyShield OCI ARM VM
and its 10 Docker containers. Powered by the Claude Agent SDK (claude-sonnet-4-6).

## What It Does

- **health-check** -- Full health check of all 10 Docker containers with markdown report
- **restart** -- Restart a specific container (requires confirmation in prod)
- **logs** -- Tail container logs (last 100 lines by default)
- **resources** -- VM CPU, RAM, disk, and load average snapshot
- **diagnose** -- Root-cause analysis for a reported symptom

## Quick Start

```bash
cp ../../.env.example .env
# Edit .env and fill in ANTHROPIC_API_KEY, OCI_VM_HOST

npm install
npm run build

# Run a health check
npm start -- health-check

# Or use tsx for development
npm run dev -- health-check
```

## Usage

```
agent-cloud <task> [argument]

Tasks:
  health-check                  Full health check of all 10 Docker containers
  restart <container>           Restart a specific container
  logs <container>[:<lines>]    Tail container logs (default: 100 lines)
  resources                     VM CPU, RAM, disk, and load usage
  diagnose "<symptom>"          Diagnose a specific issue

Container names: (full or short form accepted)
  adguard  headscale  mitmproxy  redis  api
  nodered  influxdb   grafana    ntfy   cloudflared

Examples:
  agent-cloud health-check
  agent-cloud restart redis
  agent-cloud restart familyshield-mitmproxy
  agent-cloud logs adguard
  agent-cloud logs api:200
  agent-cloud resources
  agent-cloud diagnose "DNS filtering stopped working"
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | -- | Anthropic API key |
| `OCI_VM_HOST` | Yes | -- | OCI VM IP or hostname |
| `OCI_VM_USER` | No | `ubuntu` | SSH username |
| `OCI_SSH_KEY_PATH` | No | `~/.ssh/familyshield` | Path to SSH private key |
| `ENVIRONMENT` | No | `dev` | `dev`, `staging`, or `prod` |

## The 10 Managed Containers

| Container | Ports | Purpose |
|---|---|---|
| `familyshield-adguard` | 53, 3080 | DNS filtering, per-device profiles |
| `familyshield-headscale` | 8080 | Tailscale control plane (WireGuard VPN) |
| `familyshield-mitmproxy` | 8888, 8889 | SSL inspection, content ID extraction |
| `familyshield-redis` | 6379 | Event queue (mitmproxy to API worker) |
| `familyshield-api` | 3001 | Enrichment worker and health endpoint |
| `familyshield-nodered` | 1880 | Rule engine / flow automation |
| `familyshield-influxdb` | 8086 | Time-series metrics |
| `familyshield-grafana` | 3001 | Usage dashboards |
| `familyshield-ntfy` | 2586 | Push notifications to parent phone |
| `familyshield-cloudflared` | -- | Cloudflare Tunnel daemon (outbound only) |

## Reports

All health-check, resources, and diagnose tasks save markdown reports to `./reports/`
with timestamped filenames:

```
reports/
  health-prod-2026-04-05T14-30-00.md
  resources-dev-2026-04-05T14-35-00.md
  diagnose-staging-2026-04-05T15-00-00.md
```

## Docker Usage

```bash
docker build -t familyshield-agent-cloud .

docker run --rm \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -e OCI_VM_HOST="$OCI_VM_HOST" \
  -e ENVIRONMENT=prod \
  -v ~/.ssh/familyshield:/home/agentcloud/.ssh/familyshield:ro \
  -v ./reports:/app/reports \
  familyshield-agent-cloud health-check
```

## Production Safety

When `ENVIRONMENT=prod`, the **restart** task uses the Agent SDK's
`AskUserQuestion` tool to ask for explicit "YES" confirmation before
issuing any `docker restart` command. This prevents accidental service
interruption for children's devices.

## Architecture

```
CLI (index.ts)
  --> parseArgs() --> task prompt builder (tasks/*.ts)
  --> runAgent() --> Claude Agent SDK query()
        --> Bash tool: ssh -i ~/.ssh/familyshield ubuntu@<VM>
              --> docker ps / docker stats / docker logs / docker restart
        --> Write tool: saves markdown reports to ./reports/
```

## Development

```bash
npm run dev -- health-check          # Run with tsx (no build step)
npm run typecheck                    # Type-check without building
npm run lint                         # Lint with ESLint
npm run build                        # Compile to dist/
```
