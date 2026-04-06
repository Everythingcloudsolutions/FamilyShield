/**
 * FamilyShield Cloud Agent — Logs Task
 * ======================================
 * Builds the prompt for fetching the last N lines of logs from a
 * specific Docker container. Defaults to 100 lines.
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import { CONTAINERS } from "../types.js";
import type { ContainerName, AgentConfig } from "../types.js";
import { remoteCmd } from "../ssh.js";

/** Default number of log lines to tail. */
export const DEFAULT_LOG_LINES = 100;

/**
 * Parses a container input that may optionally include a line count.
 * Accepts formats like:
 *   - "redis"
 *   - "familyshield-redis"
 *   - "redis:200"   (200 lines)
 */
export function parseLogsInput(input: string): {
  containerInput: string;
  lines: number;
} {
  const parts = input.split(":");
  const containerInput = parts[0] ?? input;
  const rawLines = parts[1];
  const lines =
    rawLines !== undefined ? (parseInt(rawLines, 10) || DEFAULT_LOG_LINES) : DEFAULT_LOG_LINES;
  return { containerInput, lines };
}

/**
 * Resolves a short or full container name to the canonical ContainerName.
 */
function resolveContainerName(input: string): ContainerName | null {
  const full = input.startsWith("familyshield-")
    ? input
    : `familyshield-${input}`;
  if ((CONTAINERS as readonly string[]).includes(full)) {
    return full as ContainerName;
  }
  return null;
}

/**
 * Returns the prompt text for a logs task.
 */
export function buildLogsPrompt(
  config: AgentConfig,
  containerInput: string,
  lines: number = DEFAULT_LOG_LINES
): string {
  const container = resolveContainerName(containerInput);

  if (!container) {
    const validList = CONTAINERS.join(", ");
    return `
The container name "${containerInput}" is not a valid FamilyShield container.

Valid containers are:
${validList}

You can use either the full name (e.g., familyshield-redis) or the short name (e.g., redis).
You can optionally suffix with a line count, e.g., "redis:200" for 200 lines.

Please inform the user and ask them to specify a valid container name.
`.trim();
  }

  const logsCmd = remoteCmd(
    config,
    `docker logs --tail ${lines} --timestamps ${container} 2>&1`
  );
  const inspectCmd = remoteCmd(
    config,
    `docker inspect ${container} --format '{{.State.Status}} | Started: {{.State.StartedAt}} | Restarts: {{.RestartCount}}'`
  );

  return `
You are fetching the last ${lines} log lines from the Docker container "${container}" on the FamilyShield ${config.environment.toUpperCase()} VM.

## Step 1 — Check container state
\`\`\`
${inspectCmd}
\`\`\`

## Step 2 — Fetch logs
\`\`\`
${logsCmd}
\`\`\`

## Step 3 — Report the results
After running both commands, provide:
1. Container status (running/stopped/restarting)
2. The full log output from Step 2 — do NOT truncate or summarise the logs
3. A brief analysis of any ERROR, WARN, FATAL, or panic lines found in the logs
4. The total number of log lines returned

If the container is not running, also note when it last stopped and the exit code if available.
`.trim();
}
