/**
 * FamilyShield Cloud Agent — Diagnose Task
 * ==========================================
 * Builds the prompt for diagnosing a specific issue described by the user.
 * The agent investigates root causes rather than just surface symptoms,
 * checking logs, resource usage, container state, and network connectivity.
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import { remoteCmd } from "../ssh.js";
import type { AgentConfig } from "../types.js";

/**
 * Returns the prompt text for a diagnose task.
 * The agent receives a free-text symptom description and autonomously
 * decides which commands to run to find the root cause.
 */
export function buildDiagnosePrompt(
  config: AgentConfig,
  symptom: string
): string {
  const ssh = (cmd: string): string => remoteCmd(config, cmd);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const reportFile = `./reports/diagnose-${config.environment}-${timestamp}.md`;

  return `
You are diagnosing a reported issue on the FamilyShield ${config.environment.toUpperCase()} OCI ARM VM.

## Reported Symptom
"${symptom}"

## Your Mission
Investigate the root cause of this symptom — do NOT just describe the symptom.
Think step by step. Use the Bash tool to run SSH commands and gather evidence.
Follow the clues. Do not stop at the first finding; look for what caused it.

## Diagnostic Toolkit
Use the commands below as your starting point. Run more commands as needed
based on what you discover.

### Container state overview
\`\`\`
${ssh("docker ps -a --format 'table {{.Names}}\\t{{.Status}}\\t{{.RunningFor}}\\t{{.Ports}}'")}
\`\`\`

### Recent container events (last 2 hours)
\`\`\`
${ssh("docker events --since 2h --until now 2>/dev/null | tail -30 || echo 'No events'")}
\`\`\`

### System journal errors (last 30 minutes)
\`\`\`
${ssh("sudo journalctl --since '30 minutes ago' -p err --no-pager | tail -50 2>/dev/null || journalctl --since '30 minutes ago' -p err --no-pager | tail -50 2>/dev/null || echo 'journalctl unavailable'")}
\`\`\`

### OOM kills and kernel errors
\`\`\`
${ssh("sudo dmesg | grep -E 'oom|OOM|killed|memory' | tail -20 2>/dev/null || echo 'dmesg unavailable'")}
\`\`\`

### Disk space check
\`\`\`
${ssh("df -h && echo '---' && du -sh /var/lib/docker 2>/dev/null || echo 'docker dir unavailable'")}
\`\`\`

### Network connectivity check
\`\`\`
${ssh("ping -c 2 8.8.8.8 2>&1 && curl -s --max-time 5 https://api.anthropic.com/v1/models -o /dev/null -w '%{http_code}' 2>/dev/null || echo 'network check failed'")}
\`\`\`

### Cloudflare tunnel status
\`\`\`
${ssh("docker logs --tail 20 familyshield-cloudflared 2>&1 || echo 'cloudflared container unavailable'")}
\`\`\`

## Investigation Process
1. Run the commands above relevant to the symptom
2. Follow any clues — if a container is stopped, check its logs
3. If logs show errors, trace them back to their cause
4. Check resource constraints (OOM, disk full, CPU throttling)
5. Check dependencies (e.g., if API is down, is Redis running? Is Supabase reachable?)

## Required Output
After completing your investigation, use the Write tool to save a diagnostic
report to: ${reportFile}

The report MUST include:
\`\`\`markdown
# FamilyShield Diagnostic Report — ${config.environment.toUpperCase()}
**Generated:** <ISO timestamp>
**Symptom Reported:** ${symptom}

## Severity
[low | medium | high | critical]

## Findings
1. <first finding>
2. <second finding>
...

## Root Cause
<Single clear statement of what actually caused the symptom>

## Recommendation
<Specific steps to fix the issue, in order of priority>

## Commands Run
<List the commands you ran and a one-line summary of each result>
\`\`\`

After writing the report, print:
- The severity level
- The root cause (one sentence)
- The top recommendation
- The path to the saved report: ${reportFile}
`.trim();
}
