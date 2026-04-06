#!/usr/bin/env node
/**
 * FamilyShield IaC Management Agent — CLI Entry Point
 * ====================================================
 * Accepts commands from the CLI and delegates to the Claude Agent SDK.
 * Runs OpenTofu (tofu) operations against the FamilyShield IaC in iac/.
 *
 * Usage:
 *   agent-iac plan dev
 *   agent-iac apply dev
 *   agent-iac drift dev
 *   agent-iac outputs dev
 *   agent-iac plan prod --force-prod
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import "dotenv/config";
import { Command } from "commander";
import { runPlan } from "./tasks/plan.js";
import { runApply } from "./tasks/apply.js";
import { runDrift } from "./tasks/drift.js";
import { runOutputs } from "./tasks/outputs.js";
import type { Environment, TaskOptions } from "./types.js";

const VALID_ENVIRONMENTS: Environment[] = ["dev", "staging", "prod"];

function parseEnvironment(env: string): Environment {
  if (!VALID_ENVIRONMENTS.includes(env as Environment)) {
    console.error(
      `[agent-iac] Invalid environment: "${env}". Must be one of: ${VALID_ENVIRONMENTS.join(", ")}`
    );
    process.exit(1);
  }
  return env as Environment;
}

function buildOptions(env: Environment, cmd: { forceProd?: boolean }): TaskOptions {
  return {
    environment: env,
    forceProd: cmd.forceProd ?? false,
    iacDir: new URL("../../../iac", import.meta.url).pathname,
  };
}

const program = new Command();

program
  .name("agent-iac")
  .description(
    "FamilyShield IaC Management Agent — intelligently manages OpenTofu infrastructure via Claude AI"
  )
  .version("0.1.0");

// ------------------------------------------------------------------
// plan <environment>
// ------------------------------------------------------------------
program
  .command("plan <environment>")
  .description("Run tofu plan for the given environment and show the diff")
  .option("--force-prod", "Required to plan the prod environment")
  .action(async (envArg: string, cmdOpts: { forceProd?: boolean }) => {
    const env = parseEnvironment(envArg);
    if (env === "prod" && !cmdOpts.forceProd) {
      console.error(
        "[agent-iac] ERROR: Planning prod requires --force-prod flag for safety."
      );
      process.exit(1);
    }
    const opts = buildOptions(env, cmdOpts);
    await runPlan(opts);
  });

// ------------------------------------------------------------------
// apply <environment>
// ------------------------------------------------------------------
program
  .command("apply <environment>")
  .description(
    "Run tofu plan, show diff, prompt for confirmation, then apply (never auto-applies prod)"
  )
  .option("--force-prod", "Required to even plan the prod environment")
  .action(async (envArg: string, cmdOpts: { forceProd?: boolean }) => {
    const env = parseEnvironment(envArg);
    if (env === "prod") {
      console.error(
        "[agent-iac] ERROR: The agent never auto-applies to prod. " +
          "Run 'agent-iac plan prod --force-prod' and apply manually via GitHub Actions."
      );
      process.exit(1);
    }
    const opts = buildOptions(env, cmdOpts);
    await runApply(opts);
  });

// ------------------------------------------------------------------
// drift <environment>
// ------------------------------------------------------------------
program
  .command("drift <environment>")
  .description("Detect drift between desired IaC state and actual cloud state")
  .option("--force-prod", "Required to run drift detection on prod")
  .action(async (envArg: string, cmdOpts: { forceProd?: boolean }) => {
    const env = parseEnvironment(envArg);
    if (env === "prod" && !cmdOpts.forceProd) {
      console.error(
        "[agent-iac] ERROR: Drift detection on prod requires --force-prod flag for safety."
      );
      process.exit(1);
    }
    const opts = buildOptions(env, cmdOpts);
    await runDrift(opts);
  });

// ------------------------------------------------------------------
// outputs <environment>
// ------------------------------------------------------------------
program
  .command("outputs <environment>")
  .description("Show all IaC outputs for the given environment")
  .option("--force-prod", "Required to read outputs from prod")
  .action(async (envArg: string, cmdOpts: { forceProd?: boolean }) => {
    const env = parseEnvironment(envArg);
    if (env === "prod" && !cmdOpts.forceProd) {
      console.error(
        "[agent-iac] ERROR: Reading prod outputs requires --force-prod flag for safety."
      );
      process.exit(1);
    }
    const opts = buildOptions(env, cmdOpts);
    await runOutputs(opts);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error("[agent-iac] Fatal error:", err);
  process.exit(1);
});
