/**
 * FamilyShield Cloud Agent — Core Agent
 * =======================================
 * Wraps the Claude Agent SDK query() function.
 * Applies the system prompt, configures allowed tools, and streams output
 * to the console as the agent works.
 *
 * Model: claude-sonnet-4-6 (as specified by project requirements)
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import type { AgentConfig } from "./types.js";

/**
 * The system prompt establishes the agent's persona and core behaviours.
 * It is stable across all task types — task-specific instructions are
 * injected in the user prompt built by each task module.
 */
function buildSystemPrompt(config: AgentConfig): string {
  return `
You are an expert DevOps engineer responsible for monitoring and managing the FamilyShield cloud infrastructure.

## Your Environment
- Platform: Oracle Cloud (OCI) — ca-toronto-1, Toronto, Canada
- VM: VM.Standard.A1.Flex (4 OCPU, 24 GB RAM, Always Free) running Ubuntu 22.04 ARM64
- Current environment: ${config.environment.toUpperCase()}
- VM host: ${config.ociVmHost}
- SSH user: ${config.ociVmUser}
- SSH key: ${config.sshKeyPath}

## Your Responsibilities
FamilyShield is a parental control platform. All 10 Docker containers on the VM must
be healthy for children's devices to be properly protected. Your job is to:
1. Check container health before taking any action
2. Identify root causes, not just symptoms
3. Report clearly on what is healthy and what needs attention
4. Protect production: always ask for explicit confirmation before restarting
   containers in the prod environment
5. Generate clear, actionable markdown reports

## The 10 FamilyShield Services
| Container | Purpose |
|---|---|
| familyshield-adguard | DNS filtering and per-device profiles |
| familyshield-headscale | Tailscale control plane (WireGuard VPN) |
| familyshield-mitmproxy | SSL inspection, content ID extraction |
| familyshield-redis | Event queue between mitmproxy and API |
| familyshield-api | Platform enrichment worker + health endpoint |
| familyshield-nodered | Rule engine and flow automation |
| familyshield-influxdb | Time-series metrics storage |
| familyshield-grafana | Usage dashboards |
| familyshield-ntfy | Push notifications to parent's phone |
| familyshield-cloudflared | Cloudflare Tunnel daemon (outbound only) |

## Critical Services
adguard, mitmproxy, and cloudflared are the most critical — if these go down,
DNS filtering and traffic inspection stop working immediately.

## Behaviour Rules
- Always run a quick health check before issuing any restart
- Never restart multiple containers simultaneously without explicit instruction
- In prod: use AskUserQuestion to get explicit "YES" confirmation before any restart
- Report exact container names, not short names, in all output
- Include timestamps in all reports
- Save reports to ./reports/ with timestamped filenames
- Be concise in the terminal output; be thorough in saved reports
`.trim();
}

/** Options for the runAgent function. */
export interface RunAgentOptions {
  config: AgentConfig;
  taskPrompt: string;
  /** Optional: the working directory for file operations (reports save location). */
  cwd?: string;
}

/**
 * Runs the Claude Agent SDK with the given task prompt.
 * Streams assistant output to stdout as it arrives.
 * Returns the final result string.
 */
export async function runAgent(options: RunAgentOptions): Promise<string> {
  const { config, taskPrompt, cwd } = options;

  const systemPrompt = buildSystemPrompt(config);
  let finalResult = "";

  process.stdout.write("\n");

  for await (const message of query({
    prompt: taskPrompt,
    options: {
      model: "claude-sonnet-4-6",
      systemPrompt,
      allowedTools: ["Bash", "Read", "Write"],
      permissionMode: "acceptEdits",
      cwd: cwd ?? process.cwd(),
      maxTurns: 30,
    },
  })) {
    // Stream text content to stdout as it arrives
    if (
      "type" in message &&
      message.type === "assistant" &&
      "content" in message
    ) {
      const content = message.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (
            typeof block === "object" &&
            block !== null &&
            "type" in block &&
            block.type === "text" &&
            "text" in block &&
            typeof block.text === "string"
          ) {
            process.stdout.write(block.text);
          }
        }
      }
    }

    // Capture the final result
    if ("result" in message && typeof message.result === "string") {
      finalResult = message.result;
    }
  }

  process.stdout.write("\n");
  return finalResult;
}
