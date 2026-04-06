# agent-iac — FamilyShield IaC Management Agent

Intelligent OpenTofu/Terraform management agent powered by the Claude Agent SDK. Plans, applies, and monitors FamilyShield infrastructure on Oracle Cloud (OCI) ca-toronto-1.

## What it does

- **Plan** — Preview infrastructure changes before they happen
- **Apply** — Deploy changes after reviewing the plan
- **Drift** — Detect when real infrastructure diverges from declared state
- **Outputs** — Show key infrastructure outputs (VM IPs, portal URLs, etc.)

## Prerequisites

- Node.js 20+
- OpenTofu CLI installed and on `$PATH`
- OCI credentials configured (`~/.oci/config` or environment variables)
- `ANTHROPIC_API_KEY` environment variable set

## Installation

```bash
cd apps/agent-iac
npm install
npm run build
```

## Usage

### Plan (preview changes)

```bash
# Preview dev environment changes
node dist/index.js plan dev

# Preview staging changes
node dist/index.js plan staging

# Preview prod (requires --force-prod flag)
node dist/index.js plan prod --force-prod
```

### Apply (deploy changes)

```bash
# Deploy to dev (auto-deploys after plan review)
node dist/index.js apply dev

# Deploy to staging
node dist/index.js apply staging

# Prod deploy is blocked in this agent — use GitHub Actions instead
# node dist/index.js apply prod  ← ERROR: use GitHub Actions for prod
```

### Drift detection

```bash
# Check if dev environment has drifted from declared state
node dist/index.js drift dev

# Check staging
node dist/index.js drift staging

# Check prod (requires --force-prod)
node dist/index.js drift prod --force-prod
```

### Show outputs

```bash
# Show all outputs for dev (VM IP, portal URL, etc.)
node dist/index.js outputs dev

# Show outputs for prod
node dist/index.js outputs prod --force-prod
```

## Claude Code skill

Use the `/deploy` slash command in Claude Code for a guided deploy experience:

```
/deploy
```

This invokes `.claude/commands/deploy.md` which walks you through environment selection, plan review, and confirmation.

## Docker

```bash
# Build the image
docker build -t ghcr.io/everythingcloudsolutions/familyshield-agent-iac:latest .

# Run against the iac/ directory
docker run --rm \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -e OCI_TENANCY_OCID="$OCI_TENANCY_OCID" \
  -e OCI_USER_OCID="$OCI_USER_OCID" \
  -e OCI_FINGERPRINT="$OCI_FINGERPRINT" \
  -e OCI_PRIVATE_KEY="$OCI_PRIVATE_KEY" \
  -v "$(pwd)/../../iac:/iac" \
  ghcr.io/everythingcloudsolutions/familyshield-agent-iac:latest \
  plan dev
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude Agent SDK |
| `OCI_TENANCY_OCID` | Yes | OCI tenancy OCID |
| `OCI_USER_OCID` | Yes | OCI IAM user OCID |
| `OCI_FINGERPRINT` | Yes | OCI API key fingerprint |
| `OCI_PRIVATE_KEY` | Yes | Path to OCI private key PEM file |
| `OCI_REGION` | No | Default: `ca-toronto-1` |
| `TF_VAR_*` | Per env | Terraform variable overrides |

## Safety rules

- **Never applies to prod** directly — prod deploys go through GitHub Actions with manual approval
- **Always shows plan** before applying — the agent will not apply without displaying the diff
- **`--force-prod`** flag required to even run plan/drift/outputs against prod
- **Destroy guard** — if plan shows >5 resources being destroyed, the agent pauses and asks for explicit confirmation

## Architecture

```
src/
├── index.ts          ← CLI entry (commander)
├── types.ts          ← Shared TypeScript types
├── agent.ts          ← Claude Agent SDK query() wrapper
└── tasks/
    ├── plan.ts       ← tofu plan + structured diff
    ├── apply.ts      ← tofu apply (with confirmation)
    ← drift.ts       ← Drift detection via tofu plan -refresh
    └── outputs.ts    ← tofu output -json formatter
```

---

*FamilyShield · Everythingcloudsolutions · Canada · 2026*
