/**
 * FamilyShield Agent API — CLI Entry Point
 * =========================================
 * Claude Agent SDK-based CLI for managing the FamilyShield enrichment pipeline.
 *
 * Usage:
 *   npx tsx src/index.ts review-queue
 *   npx tsx src/index.ts check-spend
 *   npx tsx src/index.ts add-enricher instagram
 *   npx tsx src/index.ts review-logs
 *   npx tsx src/index.ts diagnose youtube
 *   npx tsx src/index.ts test-enricher youtube dQw4w9WgXcQ
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import "dotenv/config";
import { runAgent } from "./agent.js";

const USAGE = `
FamilyShield Agent API — Claude Agent SDK CLI

Usage: npx tsx src/index.ts <task> [args...]

Tasks:
  review-queue                     Show Redis queue depth and recent events
  check-spend                      Review LLM spend against monthly budget
  add-enricher <platform>          Guide through adding a new platform enricher
  review-logs                      Analyse API worker logs for errors
  diagnose <platform>              Diagnose enrichment issues for a platform
  test-enricher <platform> <id>    Test a specific enricher with a content ID

Examples:
  npx tsx src/index.ts review-queue
  npx tsx src/index.ts check-spend
  npx tsx src/index.ts add-enricher instagram
  npx tsx src/index.ts review-logs
  npx tsx src/index.ts diagnose youtube
  npx tsx src/index.ts test-enricher youtube dQw4w9WgXcQ
  npx tsx src/index.ts test-enricher roblox 3290543031
  npx tsx src/index.ts test-enricher twitch xqc

Environment variables required:
  ANTHROPIC_API_KEY     Claude API key
  SUPABASE_URL          Supabase project URL
  SUPABASE_SERVICE_KEY  Supabase service role key
  REDIS_URL             Redis connection URL (default: redis://localhost:6379)
  GROQ_API_KEY          Groq API key (for spend tracking)
`.trim();

function parseArgs(): { task: string; args: string[] } | null {
  const argv = process.argv.slice(2);
  if (argv.length === 0) return null;
  return { task: argv[0] as string, args: argv.slice(1) };
}

function validateEnv(): string[] {
  const required = ["ANTHROPIC_API_KEY"];
  const missing: string[] = [];
  for (const key of required) {
    if (!process.env[key]) missing.push(key);
  }
  return missing;
}

async function main(): Promise<void> {
  const parsed = parseArgs();

  if (!parsed) {
    console.log(USAGE);
    process.exit(0);
  }

  const missing = validateEnv();
  if (missing.length > 0) {
    console.error(`Error: Missing required environment variables: ${missing.join(", ")}`);
    console.error("Copy .env.example to .env and fill in the values.");
    process.exit(1);
  }

  const { task, args } = parsed;

  const validTasks = [
    "review-queue",
    "check-spend",
    "add-enricher",
    "review-logs",
    "diagnose",
    "test-enricher",
  ];

  if (!validTasks.includes(task)) {
    console.error(`Error: Unknown task "${task}"`);
    console.error(`Valid tasks: ${validTasks.join(", ")}`);
    process.exit(1);
  }

  // Validate task-specific args
  if (task === "add-enricher" && args.length < 1) {
    console.error("Error: add-enricher requires a platform name");
    console.error("  Example: add-enricher instagram");
    process.exit(1);
  }
  if (task === "diagnose" && args.length < 1) {
    console.error("Error: diagnose requires a platform name");
    console.error("  Example: diagnose youtube");
    process.exit(1);
  }
  if (task === "test-enricher" && args.length < 2) {
    console.error("Error: test-enricher requires a platform name and content ID");
    console.error("  Example: test-enricher youtube dQw4w9WgXcQ");
    process.exit(1);
  }

  console.log(`\nFamilyShield Agent API — running task: ${task}`);
  if (args.length > 0) {
    console.log(`Arguments: ${args.join(" ")}`);
  }
  console.log("─".repeat(60));

  try {
    await runAgent(task, args);
  } catch (err) {
    if (err instanceof Error) {
      console.error(`\nAgent error: ${err.message}`);
    } else {
      console.error("\nAgent error: unknown error");
    }
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  if (err instanceof Error) {
    console.error("Fatal error:", err.message);
  } else {
    console.error("Fatal error:", err);
  }
  process.exit(1);
});
