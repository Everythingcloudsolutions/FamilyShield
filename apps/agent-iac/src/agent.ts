/**
 * FamilyShield IaC Agent — Core Agent Loop
 * =========================================
 * Uses the Claude Agent SDK query() function with built-in Bash, Read, Write,
 * Glob tools to autonomously execute IaC tasks against the iac/ directory.
 *
 * The agent has expert knowledge of:
 *   - OpenTofu (not Terraform) CLI and HCL syntax
 *   - OCI Always Free ARM infrastructure in ca-toronto-1
 *   - FamilyShield's three environments: dev, staging, prod
 *   - Cloudflare Tunnel + Zero Trust networking
 *
 * Year: 2026
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import type { TaskOptions } from "./types.js";

/** Tools the agent is permitted to use for IaC operations. */
const ALLOWED_TOOLS = ["Bash", "Read", "Glob"] as const;

/** Build the system prompt for the IaC management agent. */
function buildSystemPrompt(opts: TaskOptions): string {
  return `You are an expert infrastructure engineer for FamilyShield, an intelligent family safety platform built and operated by Everythingcloudsolutions (Canada, 2026).

## Your Role
You manage OpenTofu/Terraform Infrastructure as Code (IaC) for FamilyShield across three environments: dev, staging, and prod. You are currently operating on the **${opts.environment}** environment.

## Infrastructure Overview
- **Cloud Provider**: Oracle Cloud Infrastructure (OCI) — ca-toronto-1 (Toronto, Canada)
- **IaC Tool**: OpenTofu (use "tofu" command, NOT "terraform")
- **VM Shape**: VM.Standard.A1.Flex — 4 OCPU / 24GB RAM (Always Free ARM)
- **State Backend**: OCI Object Storage (S3-compatible)
- **DNS / Networking**: Cloudflare Tunnel + Zero Trust (no open inbound ports)
- **VPN**: Headscale (self-hosted Tailscale control plane)
- **Services**: AdGuard Home, mitmproxy, Redis, API worker, Node-RED, InfluxDB, Grafana, ntfy, cloudflared

## IaC Structure
The IaC lives at: ${opts.iacDir}/
- \`main.tf\` — root orchestration (OCI + Cloudflare + Supabase providers)
- \`variables.tf\` — all input variables
- \`outputs.tf\` — all outputs
- \`environments/dev/terraform.tfvars\` — dev-specific variable values
- \`environments/staging/terraform.tfvars\` — staging-specific variable values
- \`environments/prod/terraform.tfvars\` — prod-specific variable values
- \`modules/\` — oci-compartments, oci-network, oci-compute, oci-storage, cloudflare-dns, supabase, docker-services

## Operating Principles
1. **Always explain before acting**: Describe what you are about to do before running any command.
2. **Always show tofu plan before apply**: Never apply without showing the plan diff first.
3. **Never apply to prod**: Prod is managed exclusively via GitHub Actions with manual approval. If asked to apply prod, refuse politely and direct the user to GitHub Actions.
4. **Conservative by default**: When in doubt, ask rather than act. Prefer read-only operations when gathering information.
5. **Sensitive outputs**: Treat outputs marked as sensitive carefully — summarise without printing raw values.
6. **Currency**: All cost estimates are in CAD ($). The year is 2026.
7. **OpenTofu**: Always use "tofu" command, never "terraform".

## Environment: ${opts.environment}
Tfvars file: ${opts.iacDir}/environments/${opts.environment}/terraform.tfvars
${opts.environment === "prod" ? "⚠️  PROD ENVIRONMENT — Extra caution required. Never apply changes directly." : ""}

## Working Directory for tofu commands
All tofu commands must be run from: ${opts.iacDir}/
Pass the var-file flag: -var-file=environments/${opts.environment}/terraform.tfvars

## Response Format
- Use clear headings and bullet points in your reports.
- Highlight any resources being **destroyed** in bold or with WARNING markers.
- Summarise costs (in CAD) if the plan creates new billable resources.
- Always end with a clear "Next Steps" section.`;
}

/** Stream agent output to stdout and return the final result text. */
async function streamAgentOutput(
  prompt: string,
  systemPrompt: string,
  iacDir: string
): Promise<string> {
  let resultText = "";
  let turnCount = 0;

  console.log("\n" + "─".repeat(70));
  console.log("  FamilyShield IaC Agent — Starting");
  console.log("─".repeat(70) + "\n");

  for await (const message of query({
    prompt,
    options: {
      cwd: iacDir,
      allowedTools: [...ALLOWED_TOOLS],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      systemPrompt,
      maxTurns: 30,
      model: "claude-sonnet-4-6",
    },
  })) {
    // ResultMessage — final answer
    if ("result" in message) {
      resultText = message.result ?? "";
      console.log("\n" + "─".repeat(70));
      console.log("  Agent Result");
      console.log("─".repeat(70));
      console.log(resultText);
      console.log("\n" + "─".repeat(70));
      break;
    }

    // AssistantMessage — intermediate thinking/tool use steps
    if (message.type === "assistant") {
      turnCount++;
      if (Array.isArray(message.content)) {
        for (const block of message.content) {
          if (
            typeof block === "object" &&
            block !== null &&
            "type" in block
          ) {
            const typedBlock = block as { type: string; text?: string; name?: string; input?: unknown };
            if (typedBlock.type === "text" && typedBlock.text) {
              process.stdout.write(typedBlock.text);
            } else if (typedBlock.type === "tool_use" && typedBlock.name) {
              console.log(`\n[Tool: ${typedBlock.name}]`);
            }
          }
        }
      }
    }

    // System init message — capture session info
    if (message.type === "system" && "subtype" in message && message.subtype === "init") {
      const sessionId = "session_id" in message ? String(message.session_id) : "unknown";
      console.log(`[agent-iac] Session: ${sessionId}`);
    }
  }

  console.log(`\n[agent-iac] Completed in ${turnCount} turn(s).`);
  return resultText;
}

/** Run an IaC task through the agent with the given prompt. */
export async function runAgentTask(
  taskPrompt: string,
  opts: TaskOptions
): Promise<string> {
  const systemPrompt = buildSystemPrompt(opts);
  return streamAgentOutput(taskPrompt, systemPrompt, opts.iacDir);
}
