/**
 * FamilyShield Cloud Agent — Restart Task
 * =========================================
 * Builds the prompt for restarting a specific Docker container.
 * In prod environments, the agent will ask for explicit confirmation
 * before issuing the restart command.
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import { CONTAINERS } from "../types.js";
import type { ContainerName, AgentConfig } from "../types.js";
import { remoteCmd } from "../ssh.js";

/**
 * Checks whether the given string is a valid FamilyShield container name.
 * Accepts both full name (familyshield-redis) and short name (redis).
 */
export function resolveContainerName(input: string): ContainerName | null {
  const full = input.startsWith("familyshield-")
    ? input
    : `familyshield-${input}`;

  if ((CONTAINERS as readonly string[]).includes(full)) {
    return full as ContainerName;
  }
  return null;
}

/**
 * Returns the prompt text for a restart task.
 * In prod, the agent will use AskUserQuestion to confirm before restarting.
 */
export function buildRestartPrompt(
  config: AgentConfig,
  containerInput: string
): string {
  const container = resolveContainerName(containerInput);

  if (!container) {
    const validList = CONTAINERS.join(", ");
    return `
The container name "${containerInput}" is not a valid FamilyShield container.

Valid containers are:
${validList}

You can use either the full name (e.g., familyshield-redis) or the short name (e.g., redis).

Please inform the user and ask them to specify a valid container name.
`.trim();
  }

  const checkCmd = remoteCmd(
    config,
    `docker inspect ${container} --format '{{.State.Status}} (running: {{.State.Running}}, restarts: {{.RestartCount}})'`
  );
  const restartCmd = remoteCmd(config, `docker restart ${container}`);
  const postCheckCmd = remoteCmd(
    config,
    `docker inspect ${container} --format '{{.State.Status}}'`
  );

  const prodWarning =
    config.environment === "prod"
      ? `
## IMPORTANT — Production Environment
This is the PRODUCTION environment. Restarting a container may cause a brief service interruption for children's devices.

Before issuing the restart, you MUST:
1. Use the AskUserQuestion tool to ask: "Are you sure you want to restart ${container} in PRODUCTION? This may briefly interrupt service. Type YES to confirm."
2. Only proceed if the user responds with YES (case-insensitive).
3. If the user does not confirm, abort and explain that the restart was cancelled.
`.trim()
      : "";

  return `
You are restarting the Docker container "${container}" on the FamilyShield ${config.environment.toUpperCase()} VM.
${prodWarning ? "\n" + prodWarning + "\n" : ""}
## Step 1 — Check current container state
Run this command and report the current status:
\`\`\`
${checkCmd}
\`\`\`

## Step 2 — Restart the container${config.environment === "prod" ? " (only after user confirms)" : ""}
\`\`\`
${restartCmd}
\`\`\`

## Step 3 — Verify the container came back up
Wait 5 seconds, then check:
\`\`\`
${postCheckCmd}
\`\`\`

## Step 4 — Report the result
Report:
- Container name: ${container}
- Previous state (from Step 1)
- Whether the restart command succeeded or failed
- New state (from Step 3)
- Any error messages if the restart failed
`.trim();
}
