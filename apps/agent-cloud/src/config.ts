/**
 * FamilyShield Cloud Agent — Configuration
 * ==========================================
 * Reads and validates environment variables at startup.
 * Fails fast with a clear error if required vars are missing.
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import type { AgentConfig } from "./types.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `Set it in your shell or .env file before running agent-cloud.`
    );
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

export function loadConfig(): AgentConfig {
  const rawEnv = optionalEnv("ENVIRONMENT", "dev");
  if (rawEnv !== "dev" && rawEnv !== "staging" && rawEnv !== "prod") {
    throw new Error(
      `ENVIRONMENT must be one of: dev, staging, prod (got: "${rawEnv}")`
    );
  }

  return {
    anthropicApiKey: requireEnv("ANTHROPIC_API_KEY"),
    ociVmHost: requireEnv("OCI_VM_HOST"),
    ociVmUser: optionalEnv("OCI_VM_USER", "ubuntu"),
    sshKeyPath: optionalEnv(
      "OCI_SSH_KEY_PATH",
      `${process.env["HOME"] ?? "~"}/.ssh/familyshield`
    ),
    environment: rawEnv,
  };
}
