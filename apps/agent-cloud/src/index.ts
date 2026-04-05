#!/usr/bin/env node
/**
 * FamilyShield Cloud Agent — CLI Entry Point
 * ============================================
 * Parses CLI arguments, loads config from environment variables,
 * delegates to the appropriate task prompt builder, and runs the agent.
 *
 * Usage:
 *   agent-cloud health-check
 *   agent-cloud restart redis
 *   agent-cloud restart familyshield-mitmproxy
 *   agent-cloud logs adguard
 *   agent-cloud logs api:200
 *   agent-cloud resources
 *   agent-cloud diagnose "DNS queries are not being filtered"
 *
 * Environment variables:
 *   ANTHROPIC_API_KEY    — Required. Anthropic API key.
 *   OCI_VM_HOST          — Required. IP or hostname of the OCI ARM VM.
 *   OCI_VM_USER          — Optional. SSH user (default: ubuntu).
 *   OCI_SSH_KEY_PATH     — Optional. Path to SSH private key (default: ~/.ssh/familyshield).
 *   ENVIRONMENT          — Optional. dev | staging | prod (default: dev).
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import "dotenv/config";
import { mkdirSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { loadConfig } from "./config.js";
import { runAgent } from "./agent.js";
import { buildHealthCheckPrompt } from "./tasks/health-check.js";
import { buildRestartPrompt } from "./tasks/restart.js";
import { buildLogsPrompt, parseLogsInput } from "./tasks/logs.js";
import { buildResourcesPrompt } from "./tasks/resources.js";
import { buildDiagnosePrompt } from "./tasks/diagnose.js";
import type { TaskName, ParsedTask } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Colour helpers for terminal output (no external deps). */
const c = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

function printUsage(): void {
  console.log(`
${c.bold("FamilyShield Cloud Agent")} — monitors and manages the OCI ARM VM

${c.cyan("Usage:")}
  agent-cloud <task> [argument]

${c.cyan("Tasks:")}
  ${c.bold("health-check")}                       Full health check of all 10 Docker containers
  ${c.bold("restart")} <container>                Restart a specific container
  ${c.bold("logs")} <container>[:<lines>]         Tail container logs (default: 100 lines)
  ${c.bold("resources")}                          VM CPU, RAM, disk, and load usage
  ${c.bold("diagnose")} "<symptom>"               Diagnose a specific issue

${c.cyan("Container names:")} (full or short form accepted)
  adguard  headscale  mitmproxy  redis  api
  nodered  influxdb   grafana    ntfy   cloudflared

${c.cyan("Examples:")}
  agent-cloud health-check
  agent-cloud restart redis
  agent-cloud restart familyshield-mitmproxy
  agent-cloud logs adguard
  agent-cloud logs api:200
  agent-cloud resources
  agent-cloud diagnose "DNS filtering stopped working"
  agent-cloud diagnose "children can access YouTube despite it being blocked"

${c.cyan("Environment variables:")}
  ANTHROPIC_API_KEY   Required — Anthropic API key
  OCI_VM_HOST         Required — OCI VM IP or hostname
  OCI_VM_USER         Optional — SSH user (default: ubuntu)
  OCI_SSH_KEY_PATH    Optional — SSH key path (default: ~/.ssh/familyshield)
  ENVIRONMENT         Optional — dev | staging | prod (default: dev)
`);
}

function parseArgs(args: string[]): ParsedTask {
  const task = args[0];
  const argument = args.slice(1).join(" ") || null;

  const validTasks: TaskName[] = [
    "health-check",
    "restart",
    "logs",
    "resources",
    "diagnose",
  ];

  if (!task || !validTasks.includes(task as TaskName)) {
    printUsage();
    process.exit(1);
  }

  // Validate required arguments
  if (task === "restart" && !argument) {
    console.error(
      c.red('Error: "restart" requires a container name.\n') +
        c.dim('  Example: agent-cloud restart redis')
    );
    process.exit(1);
  }
  if (task === "logs" && !argument) {
    console.error(
      c.red('Error: "logs" requires a container name.\n') +
        c.dim('  Example: agent-cloud logs adguard')
    );
    process.exit(1);
  }
  if (task === "diagnose" && !argument) {
    console.error(
      c.red('Error: "diagnose" requires a symptom description.\n') +
        c.dim('  Example: agent-cloud diagnose "DNS filtering not working"')
    );
    process.exit(1);
  }

  return { name: task as TaskName, argument };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printUsage();
    process.exit(0);
  }

  // Load and validate config first (fails fast on missing env vars)
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(c.red(`\nConfiguration error:\n  ${message}\n`));
    process.exit(1);
  }

  const task = parseArgs(args);

  // Ensure the reports directory exists
  const reportsDir = resolve(__dirname, "..", "reports");
  mkdirSync(reportsDir, { recursive: true });

  // Print header
  console.log(
    c.bold("\n FamilyShield Cloud Agent") +
      c.dim(` — ${config.environment.toUpperCase()} @ ${config.ociVmHost}`)
  );
  console.log(c.dim("─".repeat(60)));
  console.log(
    `${c.cyan("Task:")} ${c.bold(task.name)}` +
      (task.argument ? `  ${c.dim(task.argument)}` : "")
  );
  console.log(c.dim("─".repeat(60)));

  // Build the task-specific prompt
  let taskPrompt: string;

  switch (task.name) {
    case "health-check":
      taskPrompt = buildHealthCheckPrompt(config);
      break;

    case "restart": {
      // argument is guaranteed non-null by parseArgs validation above
      const container = task.argument as string;
      taskPrompt = buildRestartPrompt(config, container);
      break;
    }

    case "logs": {
      const logsArg = task.argument as string;
      const { containerInput, lines } = parseLogsInput(logsArg);
      taskPrompt = buildLogsPrompt(config, containerInput, lines);
      break;
    }

    case "resources":
      taskPrompt = buildResourcesPrompt(config);
      break;

    case "diagnose": {
      const symptom = task.argument as string;
      taskPrompt = buildDiagnosePrompt(config, symptom);
      break;
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustive: never = task.name;
      console.error(c.red(`Unknown task: ${String(_exhaustive)}`));
      process.exit(1);
    }
  }

  // Run the agent
  try {
    const result = await runAgent({
      config,
      taskPrompt,
      cwd: resolve(__dirname, ".."),
    });

    if (result) {
      console.log(c.dim("─".repeat(60)));
      console.log(c.green("Done."));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(c.red(`\nAgent error: ${message}`));
    process.exit(1);
  }
}

main();
