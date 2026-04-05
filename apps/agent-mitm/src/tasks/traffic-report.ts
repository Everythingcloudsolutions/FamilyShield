/**
 * FamilyShield agent-mitm — Task: traffic-report
 *
 * Reads recent mitmproxy container logs, parses FamilyShield event log lines,
 * and produces a traffic summary including capture rate by platform,
 * top devices, and recent activity.
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import type { SshClient } from "../ssh.js";
import type { TrafficSummary, PlatformBreakdown, TrafficEvent } from "../types.js";

export interface TrafficReportData {
  readonly summary: TrafficSummary;
  readonly rawLogLines: string;
  readonly parseErrors: number;
}

// Matches log lines like:
// 2026-04-05 12:34:56 [FamilyShield] INFO Event: youtube/video id=abc device=192.168.1.5
const EVENT_LOG_REGEX =
  /\[FamilyShield\].*Event: (\w+)\/(\w+) id=([^\s]+) device=([^\s]+)/;

// Matches the periodic "Events queued:" summary line
const QUEUED_LOG_REGEX =
  /\[FamilyShield\].*Events queued: (\d+)/;

/**
 * Analyse mitmproxy logs to produce a traffic capture report.
 *
 * @param windowHours How many hours of logs to analyse (default: 24)
 */
export async function getTrafficReport(
  ssh: SshClient,
  container: string,
  windowHours = 24,
): Promise<TrafficReportData> {
  // Pull the last N lines of logs — estimate ~5 lines/min → 7200 lines/day
  const lineCount = Math.min(windowHours * 500, 10000);

  const logsResult = await ssh.exec(
    `docker logs ${container} --tail ${lineCount} 2>&1`,
  );

  const rawLogLines = logsResult.stdout.trim();

  if (!rawLogLines) {
    return {
      summary: emptyTrafficSummary(windowHours),
      rawLogLines: "",
      parseErrors:  0,
    };
  }

  const lines = rawLogLines.split("\n");

  // Parse event lines
  const events: TrafficEvent[] = [];
  let parseErrors = 0;
  let latestQueuedCount = 0;

  for (const line of lines) {
    const eventMatch = EVENT_LOG_REGEX.exec(line);
    if (eventMatch) {
      try {
        const [, platform, content_type, content_id, device_ip] = eventMatch;
        if (platform && content_type && content_id && device_ip) {
          events.push({
            platform,
            content_type,
            content_id,
            device_ip,
            url:         "",
            timestamp:   0,
            environment: "unknown",
            raw_path:    "",
          });
        }
      } catch {
        parseErrors++;
      }
      continue;
    }

    const queuedMatch = QUEUED_LOG_REGEX.exec(line);
    if (queuedMatch) {
      const n = parseInt(queuedMatch[1] ?? "0", 10);
      if (!isNaN(n)) latestQueuedCount = Math.max(latestQueuedCount, n);
    }
  }

  // Platform breakdown
  const platformCounts = new Map<string, number>();
  for (const event of events) {
    platformCounts.set(event.platform, (platformCounts.get(event.platform) ?? 0) + 1);
  }

  const totalCaptured = events.length;
  const platformBreakdown: PlatformBreakdown[] = [...platformCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([platform, count]) => ({
      platform,
      count,
      percent: totalCaptured > 0 ? Math.round((count / totalCaptured) * 100) : 0,
    }));

  // Estimate total requests from queue count + captured
  // (captured events are a subset of all requests)
  const estimatedTotal = Math.max(latestQueuedCount, totalCaptured);
  const captureRate    = estimatedTotal > 0
    ? Math.round((totalCaptured / estimatedTotal) * 100)
    : 0;

  const recentEvents = events.slice(-20);

  return {
    summary: {
      windowHours,
      totalRequests:    estimatedTotal,
      capturedEvents:   totalCaptured,
      captureRate,
      platformBreakdown,
      recentEvents,
    },
    rawLogLines: lines.slice(-200).join("\n"), // last 200 lines for agent context
    parseErrors,
  };
}

function emptyTrafficSummary(windowHours: number): TrafficSummary {
  return {
    windowHours,
    totalRequests:    0,
    capturedEvents:   0,
    captureRate:      0,
    platformBreakdown: [],
    recentEvents:     [],
  };
}
