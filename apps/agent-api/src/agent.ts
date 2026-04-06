/**
 * FamilyShield Agent API — Core Agent
 * =====================================
 * Claude Agent SDK agent for managing the enrichment pipeline.
 * Routes tasks to specialised task modules and streams results to stdout.
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import * as path from "path";
import { fileURLToPath } from "url";
import { buildReviewQueuePrompt } from "./tasks/review-queue.js";
import { buildCheckSpendPrompt } from "./tasks/check-spend.js";
import { buildAddEnricherPrompt } from "./tasks/add-enricher.js";
import { buildReviewLogsPrompt } from "./tasks/review-logs.js";
import { buildDiagnosePrompt } from "./tasks/review-logs.js";
import { buildTestEnricherPrompt } from "./tasks/test-enricher.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Absolute path to the API source — agent reads enricher code from here
const API_SRC_PATH = path.resolve(__dirname, "../../api/src");

const SYSTEM_PROMPT = `You are FamilyShield's API pipeline expert — a senior engineer specialising in the FamilyShield content enrichment and risk-scoring system.

## Your Role

You manage and operate the FamilyShield API worker, which:
- Consumes content events from a Redis queue (populated by mitmproxy intercepting HTTPS traffic)
- Calls platform APIs (YouTube Data API v3, Roblox open API, Twitch Helix API, Discord Bot API) to enrich events with metadata
- Passes enriched metadata to AI (Groq llama-3.3-70b → Anthropic claude-haiku-4-5 fallback) for risk scoring
- Stores results in Supabase (PostgreSQL + Realtime)
- Dispatches ntfy push alerts when risk_level is "high" or "critical"

## Platform Coverage

| Platform  | Content ID    | API Used              | Auth Required      |
|-----------|---------------|-----------------------|--------------------|
| YouTube   | video_id      | YouTube Data API v3   | YOUTUBE_API_KEY    |
| Roblox    | universe_id   | Roblox open API       | None               |
| Twitch    | channel_name  | Twitch Helix API      | Client ID + Secret |
| Discord   | guild/channel | Discord Bot API       | BOT_TOKEN          |
| Instagram | reel_id       | No public API         | N/A — time only    |

## Enricher Structure (apps/api/src/enrichers/)

Each enricher follows this pattern:
- Accepts RawContentEvent + base Partial<EnrichedEvent>
- Returns Promise<EnrichedEvent>
- Handles missing API keys gracefully with console.warn + fallback
- Uses axios with a 5s timeout
- Slices descriptions to 500 chars max

## Risk Scoring (apps/api/src/llm/router.ts)

- Primary: Groq llama-3.3-70b-versatile — 500k free tokens/day
- Fallback: Anthropic claude-haiku-4-5 — ~$0.02 CAD/month
- Results cached in Redis for 24h (key: risk:<platform>:<content_id>)
- Budget: Groq usage is free; Anthropic fallback budget is $5 CAD/month

## Coding Standards

- TypeScript strict mode — no "any" types, Zod for validation
- No test files
- All env vars from process.env — never hardcoded
- Conventional Commits: feat:, fix:, chore:, docs:
- Always test enricher changes against a real content ID before suggesting a commit

## Budget Awareness

You are cost-conscious about AI API spend. Always:
- Prefer Groq (free) over Anthropic (paid) for risk scoring
- Check current Groq quota before recommending AI calls
- Warn if Anthropic spend is approaching $5 CAD/month
- Recommend caching strategies to reduce API calls

When asked to modify enricher code, always:
1. Read the existing code first
2. Understand what it does and why
3. Propose the change with an explanation
4. Test the change with a real content ID
5. Only then suggest committing

The API source code lives at: ${API_SRC_PATH}`;

type TaskName =
  | "review-queue"
  | "check-spend"
  | "add-enricher"
  | "review-logs"
  | "diagnose"
  | "test-enricher";

function buildPrompt(task: string, args: string[]): string {
  switch (task as TaskName) {
    case "review-queue":
      return buildReviewQueuePrompt();
    case "check-spend":
      return buildCheckSpendPrompt();
    case "add-enricher":
      return buildAddEnricherPrompt(args[0] ?? "");
    case "review-logs":
      return buildReviewLogsPrompt();
    case "diagnose":
      return buildDiagnosePrompt(args[0] ?? "");
    case "test-enricher":
      return buildTestEnricherPrompt(args[0] ?? "", args[1] ?? "");
    default:
      return `Perform the task: ${task} ${args.join(" ")}`;
  }
}

export async function runAgent(task: string, args: string[]): Promise<void> {
  const prompt = buildPrompt(task, args);

  let turnCount = 0;

  for await (const message of query({
    prompt,
    options: {
      cwd: API_SRC_PATH,
      model: "claude-sonnet-4-6",
      systemPrompt: SYSTEM_PROMPT,
      allowedTools: ["Read", "Glob", "Grep", "Bash"],
      permissionMode: "default",
      maxTurns: 30,
    },
  })) {
    if ("result" in message) {
      // Final result — already printed incrementally; add separator
      console.log("\n" + "─".repeat(60));
      console.log("Task complete.");
    } else if (message.type === "assistant") {
      turnCount++;
      // Print text content blocks incrementally
      if (Array.isArray(message.content)) {
        for (const block of message.content) {
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
    } else if (message.type === "system" && "subtype" in message) {
      if (message.subtype === "init") {
        // Session initialised — silent
      }
    }
  }

  if (turnCount === 0) {
    console.log("No response from agent.");
  }
}
