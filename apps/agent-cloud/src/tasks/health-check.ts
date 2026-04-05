/**
 * FamilyShield Cloud Agent — Health Check Task
 * ==============================================
 * Builds the system prompt section for a full health check of all 10
 * Docker containers on the OCI ARM VM.
 *
 * The agent uses the Bash tool to SSH in, collect docker stats,
 * and then produces a markdown health report saved to ./reports/.
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import { CONTAINERS, CONTAINER_PORTS } from "../types.js";
import { remoteCmd } from "../ssh.js";
import type { AgentConfig } from "../types.js";

/**
 * Returns the prompt text passed to the agent for a health-check task.
 * The agent will execute SSH commands, analyse the output, and produce
 * a structured markdown report.
 */
export function buildHealthCheckPrompt(config: AgentConfig): string {
  const ssh = (cmd: string): string => remoteCmd(config, cmd);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const reportFile = `./reports/health-${config.environment}-${timestamp}.md`;

  const containerList = CONTAINERS.map(
    (c) => `  - ${c} (ports: ${CONTAINER_PORTS[c]})`
  ).join("\n");

  return `
You are performing a full health check of the FamilyShield ${config.environment.toUpperCase()} environment.

## Step 1 — Verify VM reachability
Run the following command and report the result:
\`\`\`
${ssh("echo 'VM reachable' && uptime")}
\`\`\`

## Step 2 — Check all 10 Docker containers
Run this command to get container status:
\`\`\`
${ssh("docker ps -a --format 'table {{.Names}}\\t{{.Status}}\\t{{.RunningFor}}'")}
\`\`\`

Then run this for CPU/memory stats (non-streaming):
\`\`\`
${ssh("docker stats --no-stream --format 'table {{.Name}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.MemPerc}}'")}
\`\`\`

The 10 containers to check are:
${containerList}

For any container that is NOT running, also run:
\`\`\`
${ssh("docker inspect <container_name> --format '{{.State.Status}} {{.State.Error}}'")}
\`\`\`

## Step 3 — Check for recent container restarts or errors
\`\`\`
${ssh("docker events --since 1h --until now --filter 'type=container' --filter 'event=die' --filter 'event=restart' 2>/dev/null | head -20 || echo 'No recent container events'")}
\`\`\`

## Step 4 — Produce a markdown report
Using the Write tool, save a complete health report to: ${reportFile}

The report MUST follow this structure:
\`\`\`markdown
# FamilyShield Health Report — ${config.environment.toUpperCase()}
**Generated:** <ISO timestamp>
**Environment:** ${config.environment}
**VM Host:** ${config.ociVmHost}

## VM Status
- Reachable: Yes/No
- Uptime: <value>
- Load: <value>

## Container Health

| Container | Status | Uptime | CPU % | Memory |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

## Issues Found
<list any containers that are stopped, restarting, or have high resource usage>

## Recommendations
<actionable recommendations based on findings>
\`\`\`

After writing the report, print:
- A short summary of what is healthy vs. what needs attention
- The path to the saved report: ${reportFile}
`.trim();
}
