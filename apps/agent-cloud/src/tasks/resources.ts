/**
 * FamilyShield Cloud Agent — Resources Task
 * ===========================================
 * Builds the prompt for collecting VM-level resource usage:
 * CPU, RAM, disk, load average, and uptime.
 * Runs on the OCI ARM VM (4 OCPU, 24 GB RAM, 50 GB boot volume).
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import { remoteCmd } from "../ssh.js";
import type { AgentConfig } from "../types.js";

/** OCI Always Free ARM VM specs for context in the report. */
const VM_SPEC = {
  shape: "VM.Standard.A1.Flex",
  ocpus: 4,
  ramGb: 24,
  diskGb: 50,
};

/**
 * Returns the prompt text for a resources task.
 */
export function buildResourcesPrompt(config: AgentConfig): string {
  const cpuCmd = remoteCmd(
    config,
    "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1"
  );
  const memCmd = remoteCmd(
    config,
    "free -m | awk 'NR==2{printf \"used=%s total=%s percent=%.1f\\n\", $3, $2, $3*100/$2}'"
  );
  const diskCmd = remoteCmd(
    config,
    "df -h / | awk 'NR==2{print \"used=\"$3\" total=\"$2\" percent=\"$5}'"
  );
  const loadCmd = remoteCmd(config, "uptime");
  const dockerStatCmd = remoteCmd(
    config,
    "docker stats --no-stream --format 'table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.MemPerc}}' 2>/dev/null || echo 'docker stats unavailable'"
  );
  const netCmd = remoteCmd(
    config,
    "ss -s 2>/dev/null | head -5 || echo 'ss unavailable'"
  );

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const reportFile = `./reports/resources-${config.environment}-${timestamp}.md`;

  return `
You are collecting VM resource usage for the FamilyShield ${config.environment.toUpperCase()} OCI ARM VM.

VM Specification:
- Shape: ${VM_SPEC.shape}
- OCPUs: ${VM_SPEC.ocpus}
- RAM: ${VM_SPEC.ramGb} GB
- Boot Volume: ${VM_SPEC.diskGb} GB
- Region: ca-toronto-1 (Canada)

## Step 1 — CPU usage
\`\`\`
${cpuCmd}
\`\`\`

## Step 2 — Memory usage
\`\`\`
${memCmd}
\`\`\`

## Step 3 — Disk usage
\`\`\`
${diskCmd}
\`\`\`

## Step 4 — Load average and uptime
\`\`\`
${loadCmd}
\`\`\`

## Step 5 — Docker container resource usage
\`\`\`
${dockerStatCmd}
\`\`\`

## Step 6 — Network connection summary
\`\`\`
${netCmd}
\`\`\`

## Step 7 — Save a markdown report
Using the Write tool, save the resource snapshot to: ${reportFile}

The report MUST include:
\`\`\`markdown
# FamilyShield Resource Report — ${config.environment.toUpperCase()}
**Generated:** <ISO timestamp>

## VM Summary
| Metric | Value | Capacity | % Used |
|---|---|---|---|
| CPU | <value>% | ${VM_SPEC.ocpus} OCPUs | <calc> |
| Memory | <used> MB | ${VM_SPEC.ramGb * 1024} MB | <calc> |
| Disk | <used> | ${VM_SPEC.diskGb} GB | <calc> |
| Load Average | <1m / 5m / 15m> | — | — |

## Docker Container Usage
<table from docker stats>

## Assessment
<brief comment on whether resources look healthy or if anything is approaching capacity>
\`\`\`

After writing the report, print:
- Key resource figures (CPU %, RAM %, disk %)
- Any containers using more than 20% CPU or 50% of available RAM
- The path to the saved report: ${reportFile}
`.trim();
}
