# FamilyShield agent-mitm

Claude Agent SDK-based TypeScript CLI that manages and monitors the mitmproxy SSL inspection service running on the FamilyShield OCI VM.

## What It Does

The agent connects to the OCI VM via SSH, gathers data from the running `familyshield-mitmproxy` Docker container, and uses `claude-sonnet-4-6` to analyse and report on the health, configuration, and effectiveness of SSL inspection.

## Tasks

| Task | Description |
|---|---|
| `status` | Container health, CPU/memory, Redis queue depth, port checks, recent logs |
| `review-addon` | Full code review of `familyshield_addon.py` — regex coverage, error handling, privacy compliance |
| `traffic-report` | 24h traffic analysis — capture rate by platform, anomalies, bypass evidence |
| `cert-info` | CA cert expiry, fingerprint, device enrollment instructions |
| `test-capture <url>` | Dry-run URL matching — would this URL be captured? What ID would be extracted? |
| `review-bypass` | Enumerate cert-pinning bypasses, DoH risks, VPN threats, and mitigations |

## Usage

```bash
# Install dependencies
npm install

# Run a task
npx tsx src/index.ts status
npx tsx src/index.ts review-addon
npx tsx src/index.ts traffic-report
npx tsx src/index.ts cert-info
npx tsx src/index.ts test-capture https://www.youtube.com/watch?v=dQw4w9WgXcQ
npx tsx src/index.ts review-bypass
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | — | Anthropic API key |
| `OCI_VM_HOST` | Yes | — | OCI VM public IP or hostname |
| `OCI_VM_USER` | Yes | — | SSH username (typically `ubuntu`) |
| `OCI_SSH_KEY_PATH` | Yes | — | Path to SSH private key file |
| `MITMPROXY_CONTAINER` | No | `familyshield-mitmproxy` | Docker container name |

Create a `.env` file (never commit it):

```
ANTHROPIC_API_KEY=sk-ant-...
OCI_VM_HOST=140.xxx.xxx.xxx
OCI_VM_USER=ubuntu
OCI_SSH_KEY_PATH=/home/mohit/.ssh/oci_key
MITMPROXY_CONTAINER=familyshield-mitmproxy
```

## Docker

```bash
# Build
docker build -t ghcr.io/everythingcloudsolutions/familyshield-agent-mitm:latest .

# Run (mount SSH key as read-only volume)
docker run --rm \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e OCI_VM_HOST=140.xxx.xxx.xxx \
  -e OCI_VM_USER=ubuntu \
  -e OCI_SSH_KEY_PATH=/keys/oci_key \
  -v ~/.ssh/oci_key:/keys/oci_key:ro \
  ghcr.io/everythingcloudsolutions/familyshield-agent-mitm:latest \
  status
```

## Architecture

```
agent-mitm (runs locally or in CI)
    |
    |── SSH ──► OCI VM (ca-toronto-1)
    |               |
    |               |── docker exec ──► familyshield-mitmproxy
    |               |── docker logs ──► mitmproxy output
    |               |── docker exec ──► familyshield-redis (queue depth)
    |               └── docker exec ──► familyshield-adguard (filter lists)
    |
    └── Anthropic API ──► claude-sonnet-4-6
```

## Privacy

The agent reads mitmproxy logs which contain:
- Platform names (youtube, roblox, etc.)
- Content IDs (video IDs, game IDs — never personal data)
- Device IP addresses (internal LAN IPs only)

The agent does **not** read message content, passwords, or personal data.
This is consistent with FamilyShield's privacy-first design.

## Cost

Each agent run costs approximately $0.01-$0.05 CAD depending on the task and amount of log data.
Model: `claude-sonnet-4-6` at $3.00/$15.00 USD per 1M tokens.

## Year

2026 — FamilyShield / Everythingcloudsolutions
