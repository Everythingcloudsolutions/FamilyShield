/**
 * FamilyShield Cloud Agent — SSH Helper
 * =======================================
 * Builds the SSH command prefix used by all task modules.
 * The agent SDK's Bash tool executes these commands directly,
 * routing through the configured OCI VM key.
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import type { AgentConfig } from "./types.js";

/**
 * Returns the SSH command prefix to prepend to any remote command.
 *
 * Example output:
 *   ssh -i ~/.ssh/familyshield -o StrictHostKeyChecking=no ubuntu@1.2.3.4
 */
export function sshPrefix(config: AgentConfig): string {
  return [
    "ssh",
    `-i ${config.sshKeyPath}`,
    "-o StrictHostKeyChecking=no",
    "-o ConnectTimeout=10",
    "-o BatchMode=yes",
    `${config.ociVmUser}@${config.ociVmHost}`,
  ].join(" ");
}

/**
 * Wraps a remote shell command with the SSH prefix and single-quotes the
 * inner command to prevent local shell interpolation issues.
 */
export function remoteCmd(config: AgentConfig, command: string): string {
  const ssh = sshPrefix(config);
  // Escape single quotes inside the command, then wrap in single quotes
  const escaped = command.replace(/'/g, "'\\''");
  return `${ssh} '${escaped}'`;
}
