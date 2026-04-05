/**
 * Task: review-queue
 * ==================
 * Builds the prompt for reviewing Redis queue depth and recent enrichment events.
 * The agent reads queue metrics from the API /metrics endpoint or directly
 * from Redis, then summarises recent event activity from Supabase.
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

/**
 * Build the prompt for the review-queue task.
 * The agent will use Bash + Read tools to:
 * 1. Check Redis queue depth (via redis-cli or curl to the API /metrics endpoint)
 * 2. Summarise recent events from Supabase
 * 3. Flag any backlog or processing delays
 */
export function buildReviewQueuePrompt(): string {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const apiMetricsUrl = "http://localhost:3001/metrics";
  const apiHealthUrl  = "http://localhost:3001/health";

  return `
Review the FamilyShield Redis event queue and recent enrichment activity.

## What to check

1. **Queue depth** — How many events are waiting to be processed?
   - Try curling the API metrics endpoint: ${apiMetricsUrl}
   - If that fails, try: redis-cli -u "${redisUrl}" LLEN familyshield:content_events
   - Also check: redis-cli -u "${redisUrl}" INFO server | grep uptime

2. **API worker health** — Is the worker running?
   - Try curling: ${apiHealthUrl}

3. **Recent events in Supabase** — What has been processed recently?
   Read the worker code at worker/event-consumer.ts to understand the data model,
   then check what's been stored. If you have SUPABASE_URL and SUPABASE_SERVICE_KEY
   available, you can query via the REST API:
     curl -s -H "apikey: $SUPABASE_SERVICE_KEY" \\
          -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \\
          "$SUPABASE_URL/rest/v1/content_events?order=captured_at.desc&limit=20"

4. **Risk distribution** — What risk levels are in recent events?
   Break down the last 100 events by risk_level (low/medium/high/critical).

5. **Platform breakdown** — Which platforms are most active?
   Show counts per platform in recent events.

## Report format

Provide a concise summary:
- Queue depth: N events waiting
- Worker status: running / stopped / unknown
- Last 24h: N events processed
  - By platform: youtube N, roblox N, twitch N, discord N
  - By risk: low N, medium N, high N, critical N
- Any backlog concerns or anomalies

Be brief and factual. Flag anything that needs immediate attention.
`.trim();
}

/**
 * Build the prompt for the diagnose task (also lives here as it reads queue/logs).
 */
export function buildDiagnosePromptForQueue(platform: string): string {
  return buildReviewQueuePrompt() + `\n\nFocus specifically on the ${platform} platform.`;
}
