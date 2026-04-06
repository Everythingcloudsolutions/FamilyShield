/**
 * FamilyShield agent-mitm — CLI Entry Point
 *
 * Usage:
 *   npx tsx src/index.ts status
 *   npx tsx src/index.ts review-addon
 *   npx tsx src/index.ts traffic-report
 *   npx tsx src/index.ts cert-info
 *   npx tsx src/index.ts test-capture https://www.youtube.com/watch?v=dQw4w9WgXcQ
 *   npx tsx src/index.ts review-bypass
 *
 * Environment variables required:
 *   ANTHROPIC_API_KEY   — Anthropic API key
 *   OCI_VM_HOST         — OCI VM public IP or hostname
 *   OCI_VM_USER         — SSH username (typically "ubuntu")
 *   OCI_SSH_KEY_PATH    — Path to SSH private key
 *   MITMPROXY_CONTAINER — Docker container name (default: familyshield-mitmproxy)
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import "dotenv/config";
import { SshClient, sshConfigFromEnv } from "./ssh.js";
import { runAgent } from "./agent.js";
import { getStatus } from "./tasks/status.js";
import { getAddonForReview } from "./tasks/review-addon.js";
import { getTrafficReport } from "./tasks/traffic-report.js";
import { getCertInfo } from "./tasks/cert-info.js";
import { testCapture } from "./tasks/test-capture.js";
import { getBypassReport } from "./tasks/review-bypass.js";
import type { TaskName } from "./types.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTAINER     = process.env["MITMPROXY_CONTAINER"] ?? "familyshield-mitmproxy";
const ADDON_PATH    = "/addon/familyshield_addon.py";
const VALID_TASKS: TaskName[] = [
  "status",
  "review-addon",
  "traffic-report",
  "cert-info",
  "test-capture",
  "review-bypass",
];

// ── CLI helpers ───────────────────────────────────────────────────────────────

function usage(): void {
  console.log(`
FamilyShield agent-mitm — mitmproxy SSL inspection manager

Usage:
  agent-mitm <task> [args]

Tasks:
  status                       Show mitmproxy container status and traffic stats
  review-addon                 Review the Python addon code for issues
  traffic-report               Analyse recent traffic capture patterns
  cert-info                    Show CA cert expiry and device trust status
  test-capture <url>           Test if a URL would be captured (dry run)
  review-bypass                Identify platforms bypassing SSL inspection

Environment variables required:
  ANTHROPIC_API_KEY            Anthropic API key
  OCI_VM_HOST                  OCI VM public IP or hostname
  OCI_VM_USER                  SSH username (typically "ubuntu")
  OCI_SSH_KEY_PATH             Path to SSH private key
  MITMPROXY_CONTAINER          Docker container name (default: familyshield-mitmproxy)

Examples:
  agent-mitm status
  agent-mitm test-capture https://www.youtube.com/watch?v=dQw4w9WgXcQ
  agent-mitm review-addon
`);
}

function checkEnv(): string {
  const key = process.env["ANTHROPIC_API_KEY"];
  if (!key) {
    console.error("ERROR: ANTHROPIC_API_KEY environment variable is required.");
    process.exit(1);
  }
  return key;
}

function printDivider(): void {
  console.log("\n" + "═".repeat(72) + "\n");
}

function printHeader(task: string): void {
  console.log(`\nFamilyShield agent-mitm | Task: ${task}`);
  console.log(`Container: ${CONTAINER}`);
  console.log(`Time: ${new Date().toISOString()}`);
  printDivider();
}

// ── Task runners ──────────────────────────────────────────────────────────────

async function runStatus(ssh: SshClient, apiKey: string): Promise<void> {
  console.log("Gathering container status...");
  const data = await getStatus(ssh, CONTAINER);

  const contextData = JSON.stringify(data, null, 2);

  const result = await runAgent(
    { apiKey },
    {
      taskDescription: "mitmproxy Container Status Review",
      contextData,
      userQuestion:
        "Analyse the container status and recent logs. Identify any issues, " +
        "warnings, or anomalies. Comment on Redis queue depth if elevated. " +
        "Provide a clear health summary and any recommended actions.",
    },
  );

  printAgentResult(result);
}

async function runReviewAddon(ssh: SshClient, apiKey: string): Promise<void> {
  console.log("Reading addon source code...");
  const data = await getAddonForReview(ssh, CONTAINER, ADDON_PATH);

  const contextData = [
    `File: ${data.filePath}`,
    `Last modified: ${data.lastModified}`,
    `Platforms detected: ${data.platforms.join(", ")} (${data.platformCount})`,
    `Total regex patterns: ${data.patternCount}`,
    `Ignored hosts: ${data.ignoredHostCount}`,
    "",
    "=== ADDON SOURCE CODE ===",
    data.source,
  ].join("\n");

  const result = await runAgent(
    { apiKey },
    {
      taskDescription: "Python Addon Code Review",
      contextData,
      userQuestion:
        "Review the familyshield_addon.py code thoroughly. Check for: " +
        "(1) regex correctness and completeness — are there URL patterns we're missing for YouTube Shorts, Roblox join scripts, Discord DMs, or Twitch clips? " +
        "(2) performance issues — could the host matching or regex order be improved? " +
        "(3) error handling gaps — what happens if Redis is down? " +
        "(4) privacy compliance — does it stay within content IDs only, never message bodies? " +
        "(5) any Python best-practice issues. " +
        "Provide specific code suggestions with line references.",
    },
  );

  printAgentResult(result);
}

async function runTrafficReport(ssh: SshClient, apiKey: string): Promise<void> {
  console.log("Analysing traffic logs (24h window)...");
  const data = await getTrafficReport(ssh, CONTAINER, 24);

  const contextData = [
    `Window: ${data.summary.windowHours} hours`,
    `Total requests (estimated): ${data.summary.totalRequests}`,
    `Captured content events: ${data.summary.capturedEvents}`,
    `Capture rate: ${data.summary.captureRate}%`,
    "",
    "Platform breakdown:",
    ...data.summary.platformBreakdown.map(
      (p) => `  ${p.platform}: ${p.count} events (${p.percent}%)`
    ),
    "",
    `Log parse errors: ${data.parseErrors}`,
    "",
    "=== RECENT LOG LINES (last 200) ===",
    data.rawLogLines,
  ].join("\n");

  const result = await runAgent(
    { apiKey },
    {
      taskDescription: "Traffic Capture Quality Report",
      contextData,
      userQuestion:
        "Analyse the traffic capture data. Assess: " +
        "(1) Is the capture rate healthy? What would be expected? " +
        "(2) Are there any platforms with suspiciously low capture rates? " +
        "(3) Are there any error patterns in the logs? " +
        "(4) What does the platform distribution tell us about device usage? " +
        "(5) Any recommended improvements to increase capture coverage?",
    },
  );

  printAgentResult(result);
}

async function runCertInfo(ssh: SshClient, apiKey: string): Promise<void> {
  console.log("Reading CA certificate...");
  const data = await getCertInfo(ssh, CONTAINER);

  const contextData = [
    `Certificate found: ${data.certFound}`,
    data.caCert
      ? [
          `Subject: ${data.caCert.subject}`,
          `Issuer: ${data.caCert.issuer}`,
          `Valid from: ${data.caCert.notBefore}`,
          `Valid until: ${data.caCert.notAfter}`,
          `Days until expiry: ${data.caCert.daysUntilExpiry}`,
          `Serial: ${data.caCert.serialNumber}`,
          `Fingerprint: ${data.caCert.fingerprint}`,
        ].join("\n")
      : "No certificate data available",
    "",
    `Status: ${data.warningMessage}`,
    "",
    "=== ENROLLMENT INSTRUCTIONS ===",
    data.enrollmentInstructions,
  ].join("\n");

  const result = await runAgent(
    { apiKey },
    {
      taskDescription: "CA Certificate Information and Rotation Assessment",
      contextData,
      userQuestion:
        "Assess the CA certificate status. " +
        "If it is expiring soon, provide a recommended rotation plan that minimises " +
        "disruption to child devices. " +
        "Always emphasise the device re-enrollment burden before recommending any cert change. " +
        "Also advise on best practices for CA cert lifetime in a home parental control context.",
    },
  );

  printAgentResult(result);
}

async function runTestCapture(url: string, apiKey: string): Promise<void> {
  console.log(`Testing URL capture: ${url}`);
  const result = testCapture(url);

  const contextData = JSON.stringify(result, null, 2);

  const agentResult = await runAgent(
    { apiKey },
    {
      taskDescription: `Test Capture: ${url}`,
      contextData,
      userQuestion:
        "Explain the capture test result in plain English. " +
        "If the URL would NOT be captured, explain why and whether it should be, " +
        "and suggest what regex pattern change to the addon would fix it. " +
        "If it WOULD be captured, confirm the extracted ID looks correct and " +
        "mention what the API worker would do with it next (enrichment → risk scoring).",
    },
  );

  printAgentResult(agentResult);
}

async function runReviewBypass(ssh: SshClient, apiKey: string): Promise<void> {
  console.log("Gathering bypass information...");
  const data = await getBypassReport(ssh, CONTAINER);

  const contextData = [
    "=== KNOWN BYPASS METHODS ===",
    ...data.knownBypasses.map((b) =>
      `[${b.platform}]\n  Method: ${b.bypassMethod}\n  Current mitigation: ${b.currentMitigation}\n  Detail: ${b.mitigation}`
    ),
    "",
    "=== ADGUARD FILTER LISTS ACTIVE ===",
    data.adguardBlockedDomains.length > 0
      ? data.adguardBlockedDomains.join("\n")
      : "(Could not query AdGuard — container may be down)",
    "",
    "=== LOG EVIDENCE OF BYPASS ATTEMPTS ===",
    data.logEvidence,
    "",
    "=== RECOMMENDED ACTIONS ===",
    ...data.recommendedActions.map((a, i) => `${i + 1}. ${a}`),
  ].join("\n");

  const result = await runAgent(
    { apiKey },
    {
      taskDescription: "SSL Inspection Bypass Review",
      contextData,
      userQuestion:
        "Review the bypass landscape for FamilyShield. Prioritise the bypasses by risk level " +
        "(which ones are most likely to be exploited by a tech-savvy 13-15 year old?). " +
        "For each unmitigated bypass, suggest the specific firewall rule, AdGuard config, " +
        "or policy change needed. Also comment on any log evidence of active bypass attempts.",
    },
  );

  printAgentResult(result);
}

// ── Output formatting ─────────────────────────────────────────────────────────

interface AgentRunResult {
  response: string;
  inputTokens: number;
  outputTokens: number;
}

function printAgentResult(result: AgentRunResult): void {
  console.log(result.response);
  printDivider();
  console.log(
    `Tokens used — input: ${result.inputTokens} | output: ${result.outputTokens} | ` +
    `est. cost: $${estimateCost(result.inputTokens, result.outputTokens).toFixed(4)} CAD`,
  );
}

/** Estimate cost in CAD at claude-sonnet-4-6 rates: $3/$15 per 1M tokens */
function estimateCost(inputTokens: number, outputTokens: number): number {
  const USD_TO_CAD = 1.37; // approximate
  const inputCostUsd  = (inputTokens  / 1_000_000) * 3.00;
  const outputCostUsd = (outputTokens / 1_000_000) * 15.00;
  return (inputCostUsd + outputCostUsd) * USD_TO_CAD;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    usage();
    process.exit(0);
  }

  const taskArg = args[0] as string;

  if (!VALID_TASKS.includes(taskArg as TaskName)) {
    console.error(`Unknown task: "${taskArg}"`);
    console.error(`Valid tasks: ${VALID_TASKS.join(", ")}`);
    process.exit(1);
  }

  const task = taskArg as TaskName;

  // test-capture does not need SSH or a running container
  if (task === "test-capture") {
    const url = args[1];
    if (!url) {
      console.error("test-capture requires a URL argument.");
      console.error("  Example: agent-mitm test-capture https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      process.exit(1);
    }

    const apiKey = checkEnv();
    printHeader(task);
    await runTestCapture(url, apiKey);
    return;
  }

  // All other tasks need SSH + API key
  const apiKey = checkEnv();

  let sshConfig;
  try {
    sshConfig = sshConfigFromEnv();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`SSH configuration error: ${message}`);
    process.exit(1);
  }

  const ssh = new SshClient(sshConfig);

  try {
    console.log(`Connecting to ${sshConfig.host}...`);
    await ssh.connect();
    console.log("SSH connected.");

    printHeader(task);

    switch (task) {
      case "status":
        await runStatus(ssh, apiKey);
        break;
      case "review-addon":
        await runReviewAddon(ssh, apiKey);
        break;
      case "traffic-report":
        await runTrafficReport(ssh, apiKey);
        break;
      case "cert-info":
        await runCertInfo(ssh, apiKey);
        break;
      case "review-bypass":
        await runReviewBypass(ssh, apiKey);
        break;
      default:
        // TypeScript exhaustiveness — should not reach here
        console.error(`Unhandled task: ${task}`);
        process.exit(1);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\nError running task "${task}": ${message}`);

    if (err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  } finally {
    await ssh.disconnect();
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Fatal error: ${message}`);
  process.exit(1);
});
