/**
 * Drift Detection Task
 * ====================
 * Compares the desired IaC state with the actual cloud state by running
 * `tofu plan` and looking for unexpected changes that indicate drift.
 *
 * Drift is defined as: resources in the actual cloud state that differ from
 * what the IaC declares — e.g. someone manually modified a security rule,
 * resized a VM, or deleted a resource outside of OpenTofu.
 *
 * Year: 2026
 */

import { runAgentTask } from "../agent.js";
import type { TaskOptions } from "../types.js";

/** Prompt for drift detection. */
function buildDriftPrompt(opts: TaskOptions): string {
  return `## Task: Infrastructure Drift Detection — ${opts.environment.toUpperCase()} Environment

Detect any drift between the declared IaC state and the actual cloud state for the **${opts.environment}** environment.

### Background
Drift occurs when the actual cloud resources differ from what OpenTofu declares — e.g. a VM was manually resized, a security rule was added via the OCI Console, or a resource was deleted outside of OpenTofu.

### Steps to follow:
1. Read \`main.tf\`, \`variables.tf\`, and all module files to understand the full declared state.
2. Read \`environments/${opts.environment}/terraform.tfvars\` for the environment config.
3. Ensure OpenTofu is initialised (check for \`.terraform\` dir; run \`tofu init\` if missing).
4. Run a refresh plan: \`tofu plan -var-file=environments/${opts.environment}/terraform.tfvars -refresh=true -no-color 2>&1\`
5. Also check the current state: \`tofu show -no-color 2>&1\` (if state file exists)
6. Analyse the plan output specifically for drift indicators.

### Drift Indicators to look for:
- Resources that will be **updated** due to configuration mismatch (not from code changes)
- Resources that appear in the plan as needing changes when no code was modified
- Resources in the state file that no longer exist in the cloud (destroyed externally)
- New resources in the cloud that are not in the state file (created externally)

### Report format:
- **Drift Status**: "No Drift Detected" or "Drift Detected — Action Required"
- **Drifted Resources**: For each drifted resource:
  - Resource address (e.g., \`module.compute.oci_core_instance.main\`)
  - What changed (attribute name, expected value, actual value)
  - Severity: LOW / MEDIUM / HIGH
- **Root Cause Assessment**: Why did this drift likely occur?
- **Remediation Options**:
  1. Import the new state into IaC (if external changes should be kept)
  2. Run \`tofu apply\` to restore the declared state (if drift should be corrected)
  3. Update the \`.tf\` files to match the new reality (if changes were intentional)
- **Recommended Action**: What the operator should do next

### Important:
- Do NOT run \`tofu apply\` — drift detection is read-only.
- If the plan output shows "No changes. Infrastructure is up-to-date." then state there is no drift.
- Be specific about which attributes differ, not just which resources.`;
}

/**
 * Detect drift between desired IaC state and actual cloud state.
 */
export async function runDrift(opts: TaskOptions): Promise<void> {
  console.log(
    `[agent-iac] Starting drift detection for environment: ${opts.environment}`
  );

  const prompt = buildDriftPrompt(opts);
  await runAgentTask(prompt, opts);
}
