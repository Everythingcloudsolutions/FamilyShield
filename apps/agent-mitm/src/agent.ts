/**
 * FamilyShield agent-mitm — Core Agent
 *
 * Wraps the Anthropic SDK and drives a single-turn agentic conversation
 * using the pre-gathered task data as context. The agent can reason about
 * the data, suggest improvements to the Python addon, identify issues,
 * and produce human-readable reports.
 *
 * Model: claude-sonnet-4-6 (as specified in the project requirements)
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4096;

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the FamilyShield mitmproxy SSL Inspection Agent — an expert in:
- mitmproxy internals, transparent proxy configuration, and SSL/TLS interception
- Python addon development for mitmproxy (the FamilyShield familyshield_addon.py)
- SSL/TLS certificate management and device enrollment
- Certificate pinning bypass techniques and mitigations
- Privacy-preserving content inspection (URL path extraction only — never message bodies or personal data)

## FamilyShield Context
- Platform: Parental control system for children aged 6-17 in Canada
- Infrastructure: Oracle Cloud (OCI) ARM VM in ca-toronto-1 with Docker
- mitmproxy runs as transparent proxy (port 8888), web UI on 8889
- Inspected platforms: YouTube, Roblox, Discord, Twitch, Instagram (browser only)
- Privacy principle: Extract content IDs from URL paths only — NEVER capture message content, usernames, passwords, or personal data
- Age profiles: 6-10 (strict), 11-14 (moderate), 15-17 (guided)

## Addon Architecture
The familyshield_addon.py:
1. Intercepts HTTPS responses via mitmproxy
2. Applies host-based pre-filter (fast)
3. Runs regex against URL to extract content ID
4. Pushes a ContentEvent to Redis queue: {platform, content_type, content_id, device_ip, timestamp}
5. The API worker then enriches and risk-scores the event

## CRITICAL — Certificate Rotation Warning
When any task involves the CA certificate:
- ALWAYS warn that regenerating the CA cert requires re-enrolling ALL child devices
- iOS requires manual profile installation + trust toggle
- Windows requires cert store import
- This is a high-friction operation — recommend it only when truly necessary
- Never suggest cert rotation casually

## Your Responsibilities
- Analyse the data provided and give clear, actionable findings
- When reviewing the addon code, check for: regex correctness, missed URL patterns, performance issues, error handling gaps
- When reviewing traffic, identify: low capture rates, unexpected patterns, potential bypass activity
- When reviewing cert info, assess expiry risk and enrollment burden
- Be concise and specific — Mohit is the operator and needs actionable output
- Format responses in Markdown with clear headings and bullet points`;

// ── Agent factory ─────────────────────────────────────────────────────────────

export interface AgentOptions {
  readonly apiKey: string;
}

export interface AgentRunOptions {
  readonly taskDescription: string;
  readonly contextData: string;
  readonly userQuestion?: string;
}

export interface AgentResult {
  readonly response: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
}

/**
 * Run the mitmproxy agent for a single task.
 * Sends all gathered context data plus the user question to the model.
 */
export async function runAgent(
  options: AgentOptions,
  run: AgentRunOptions,
): Promise<AgentResult> {
  const client = new Anthropic({ apiKey: options.apiKey });

  const userMessage = buildUserMessage(run);

  const response = await client.messages.create({
    model:      MODEL,
    max_tokens: MAX_TOKENS,
    system:     SYSTEM_PROMPT,
    messages: [
      { role: "user", content: userMessage },
    ],
  });

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  const responseText = textBlock?.text ?? "(No text response from model)";

  return {
    response:     responseText,
    inputTokens:  response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

/** Build the user message by combining task description and context data */
function buildUserMessage(run: AgentRunOptions): string {
  const parts: string[] = [
    `## Task: ${run.taskDescription}`,
    "",
    "## Gathered Data",
    "```",
    run.contextData,
    "```",
  ];

  if (run.userQuestion) {
    parts.push("", `## Question`, run.userQuestion);
  }

  return parts.join("\n");
}
