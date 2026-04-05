/**
 * Apply Task
 * ==========
 * Runs `tofu plan`, shows the diff to the user, prompts for explicit
 * confirmation, and then runs `tofu apply` if confirmed.
 *
 * Safety rules:
 *   - Never applies to prod (blocked at CLI level in index.ts)
 *   - Always runs plan first and shows diff
 *   - Requires explicit "yes" confirmation before applying
 *   - Aborts if plan shows destroy-only changes (requires explicit override)
 *
 * Year: 2026
 */

import * as readline from "readline";
import { runAgentTask } from "../agent.js";
import type { TaskOptions } from "../types.js";

/** Prompt for the plan phase of an apply. */
function buildPreApplyPlanPrompt(opts: TaskOptions): string {
  return `## Task: Pre-Apply Plan — ${opts.environment.toUpperCase()} Environment

Before applying any changes, I need to run a plan for the **${opts.environment}** environment.

### Steps to follow:
1. Read \`main.tf\` and \`variables.tf\` to understand the infrastructure scope.
2. Read \`environments/${opts.environment}/terraform.tfvars\` for env-specific config.
3. Check if \`.terraform\` directory exists; if not, run \`tofu init\`.
4. Run: \`tofu plan -var-file=environments/${opts.environment}/terraform.tfvars -no-color 2>&1\`
5. Produce a clear, detailed plan report so the operator can decide whether to proceed.

### Report format:
- **Summary**: X to add, Y to change, Z to destroy
- **Change Details**: Full list of every resource being created, modified, or removed
- **Destroy Warning**: If ANY resources will be destroyed, list them prominently with ⚠️ WARNING
- **Apply Readiness**: State "SAFE TO APPLY" or "REVIEW REQUIRED" based on risk
- **Estimated Time**: Rough estimate for how long the apply will take

### Critical:
- Do NOT run \`tofu apply\` — this is plan-only for human review.
- If there are resource destructions, clearly state this must be reviewed carefully.`;
}

/** Prompt for the actual apply phase (after user confirms). */
function buildApplyPrompt(opts: TaskOptions): string {
  return `## Task: OpenTofu Apply — ${opts.environment.toUpperCase()} Environment

The operator has reviewed the plan and confirmed they want to apply changes to **${opts.environment}**.

### Steps to follow:
1. Run: \`tofu apply -var-file=environments/${opts.environment}/terraform.tfvars -auto-approve -no-color 2>&1\`
2. Monitor the output and report on each resource as it is created/updated/destroyed.
3. If the apply fails, report the exact error and suggest remediation steps.
4. After successful apply, run: \`tofu output -json 2>&1\` and summarise the outputs.

### Report format:
- **Apply Status**: Success or Failure
- **Resources Applied**: List each resource with its final state
- **Outputs**: Key outputs (VM IP, tunnel URL, etc.) — do not print sensitive values
- **Errors** (if any): Exact error message and recommended fix
- **Next Steps**: What the operator should verify after the apply

### Important:
- If the apply exits with a non-zero code, do NOT retry — report the error immediately.
- This is ${opts.environment} — not prod. Apply is permitted.`;
}

/** Wait for interactive confirmation from the operator. */
async function confirmApply(environment: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  return new Promise<boolean>((resolve) => {
    console.log("\n" + "═".repeat(70));
    console.log("  APPLY CONFIRMATION REQUIRED");
    console.log("═".repeat(70));
    console.log(`  Environment : ${environment}`);
    console.log(`  Action      : tofu apply`);
    console.log("═".repeat(70));
    console.log("  Review the plan above carefully before proceeding.");
    console.log("  Type 'yes' to apply, anything else to abort.\n");

    rl.question("  Confirm apply? (yes/abort): ", (answer: string) => {
      rl.close();
      const confirmed = answer.trim().toLowerCase() === "yes";
      if (!confirmed) {
        console.log("\n[agent-iac] Apply aborted by operator.");
      }
      resolve(confirmed);
    });
  });
}

/**
 * Run `tofu plan`, show the diff, prompt for confirmation, then `tofu apply`.
 * Prod is blocked at the CLI level — this function only handles dev/staging.
 */
export async function runApply(opts: TaskOptions): Promise<void> {
  console.log(
    `[agent-iac] Starting apply workflow for environment: ${opts.environment}`
  );

  // Phase 1 — Plan
  console.log("\n[agent-iac] Phase 1/2: Running plan...\n");
  const planPrompt = buildPreApplyPlanPrompt(opts);
  await runAgentTask(planPrompt, opts);

  // Phase 2 — Confirm
  const confirmed = await confirmApply(opts.environment);
  if (!confirmed) {
    process.exit(0);
  }

  // Phase 3 — Apply
  console.log("\n[agent-iac] Phase 2/2: Applying...\n");
  const applyPrompt = buildApplyPrompt(opts);
  await runAgentTask(applyPrompt, opts);
}
