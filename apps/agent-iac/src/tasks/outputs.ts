/**
 * Outputs Task
 * ============
 * Reads and formats all IaC outputs for a given environment.
 * Sensitive outputs are redacted in the display.
 *
 * Outputs include: VM public IP, Cloudflare tunnel URL, Supabase project URL,
 * compartment OCIDs, and other key infrastructure values.
 *
 * Year: 2026
 */

import { runAgentTask } from "../agent.js";
import type { TaskOptions } from "../types.js";

/** Prompt for the outputs task. */
function buildOutputsPrompt(opts: TaskOptions): string {
  return `## Task: Show IaC Outputs — ${opts.environment.toUpperCase()} Environment

Read and display all OpenTofu outputs for the **${opts.environment}** environment.

### Steps to follow:
1. Read \`outputs.tf\` to understand what outputs are declared.
2. Ensure OpenTofu is initialised (check for \`.terraform\` dir; run \`tofu init\` if missing).
3. Run: \`tofu output -json -var-file=environments/${opts.environment}/terraform.tfvars 2>&1\`
   - If that fails (e.g. no state file), fall back to: \`tofu output -no-color 2>&1\`
4. Also read \`outputs.tf\` to annotate each output with its description.

### Report format:
Produce a clean, formatted table of all outputs. Group them by module/category:

#### Network & Connectivity
| Output Name | Value | Description |
|---|---|---|
| vm_public_ip | 1.2.3.4 | OCI VM public IP address |
| tunnel_url | https://... | Cloudflare Tunnel URL |

#### Identity & Access
| Output Name | Value | Description |
|---|---|---|
| compartment_id | ocid1.compartment... | Dev compartment OCID |

#### Application
| Output Name | Value | Description |
|---|---|---|
| supabase_project_url | https://... | Supabase project URL |

### Sensitive Values:
- Any output where \`sensitive = true\` in \`outputs.tf\` must be shown as \`[REDACTED - sensitive]\`
- Do NOT print API keys, passwords, tokens, or tunnel secrets
- For OCIDs: show the full value (these are identifiers, not secrets)

### If no state exists:
- State "No state file found for ${opts.environment} — the infrastructure has not been applied yet."
- List the outputs that WILL be available after \`tofu apply\` (from outputs.tf)

### Summary section:
After the table, add a brief summary:
- Is the infrastructure currently deployed?
- What is the portal URL for this environment?
- What is the VM's IP address (for SSH/admin access)?
- Are there any outputs with errors or missing values?`;
}

/**
 * Show all IaC outputs for the specified environment.
 */
export async function runOutputs(opts: TaskOptions): Promise<void> {
  console.log(
    `[agent-iac] Fetching outputs for environment: ${opts.environment}`
  );

  const prompt = buildOutputsPrompt(opts);
  await runAgentTask(prompt, opts);
}
