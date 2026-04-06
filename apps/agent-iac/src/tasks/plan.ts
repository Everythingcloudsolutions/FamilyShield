/**
 * Plan Task
 * =========
 * Runs `tofu plan` for a given environment and returns a formatted diff report.
 * The agent initialises OpenTofu if needed, then runs a plan with the correct
 * var-file and presents a human-readable summary of changes.
 *
 * Year: 2026
 */

import { runAgentTask } from "../agent.js";
import type { TaskOptions } from "../types.js";

/** Prompt template for the plan task. */
function buildPlanPrompt(opts: TaskOptions): string {
  return `## Task: OpenTofu Plan — ${opts.environment.toUpperCase()} Environment

Please run an OpenTofu plan for the **${opts.environment}** environment of FamilyShield and produce a clear report.

### Steps to follow:
1. Read the root \`main.tf\` and \`variables.tf\` to understand the infrastructure.
2. Read the environment-specific tfvars file: \`environments/${opts.environment}/terraform.tfvars\`.
3. Check if \`.terraform\` directory exists (run \`ls -la\` in iac/); if not, run \`tofu init\`.
4. Run: \`tofu plan -var-file=environments/${opts.environment}/terraform.tfvars -no-color 2>&1\`
5. Parse the plan output and produce a structured report.

### Report format:
- **Summary**: X to add, Y to change, Z to destroy
- **Changes Detail**: List each resource being added, changed, or destroyed
- **Risk Assessment**: Flag any destructive changes (destroys/replacements) with a WARNING
- **Estimated Impact**: Any cost implications in CAD ($)
- **Next Steps**: What to do after reviewing this plan

### Important:
- If there are resources to be **destroyed**, clearly highlight them with ⚠️ WARNING markers.
- If the plan shows no changes, state "Infrastructure is up to date — no changes required."
- Do not run \`tofu apply\` — plan only.`;
}

/**
 * Run `tofu plan` for the specified environment and print a formatted diff.
 */
export async function runPlan(opts: TaskOptions): Promise<void> {
  console.log(
    `[agent-iac] Starting plan task for environment: ${opts.environment}`
  );

  const prompt = buildPlanPrompt(opts);
  await runAgentTask(prompt, opts);
}
