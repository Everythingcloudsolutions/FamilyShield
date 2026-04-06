/**
 * Task: review-logs + diagnose
 * =============================
 * Builds prompts for analysing API worker logs and diagnosing platform issues.
 * The agent searches for error patterns, slow enrichers, and AI fallback usage.
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

/**
 * Build the prompt for the review-logs task.
 * Agent reads log files / Docker container logs and analyses for errors.
 */
export function buildReviewLogsPrompt(): string {
  return `
Analyse the FamilyShield API worker logs for errors and issues.

## Log sources to check

1. **Docker container logs** (if running on OCI VM):
   bash -c "docker logs familyshield-api --tail 500 2>&1 | head -200"

2. **Local dev logs** (if running locally with tsx):
   Look for log files in the api directory or recent terminal output.
   Check if there's a logs/ directory: ls -la logs/ 2>/dev/null

3. **API worker source** — understand what ERROR patterns look like:
   Read worker/event-consumer.ts to see what errors are logged
   Read llm/router.ts to see Groq/Anthropic error patterns
   Read enrichers/index.ts to see enrichment error patterns

## What to look for

### Critical errors (need immediate attention)
- "Fatal startup error" — worker crashed on startup
- Redis connection failures ("ECONNREFUSED", "NOAUTH")
- Supabase insert failures ("Supabase insert failed")
- "Event processing error" with high frequency (>5 in last hour)

### Enrichment failures (platform-specific)
- "Enrichment failed for youtube/" — YouTube API key issue or rate limit
- "Enrichment failed for roblox/" — Roblox API down or bad universe ID
- "Enrichment failed for twitch/" — OAuth token expired
- "Enrichment failed for discord/" — Bot token invalid

### AI scoring issues
- "Groq failed, falling back to Anthropic" — Groq quota or errors
- JSON parse failures in risk scoring — LLM returned invalid JSON
- "Risk score from cache" absence — cache not working

### Performance issues
- Events with very slow processing (>10s per event)
- Queue depth growing faster than it's draining

## Report format

Provide:
1. **Error summary** — Top 5 most frequent errors in the last 24h
2. **Platform health** — Which enrichers are working vs failing
3. **AI provider status** — Groq working? Anthropic fallbacks needed?
4. **Queue health** — Processing rate vs intake rate
5. **Recommendations** — What to fix and in what order

Be specific: include actual error messages, timestamps if available, and counts.
`.trim();
}

/**
 * Build the prompt for the diagnose task.
 * Focuses on a specific platform's enrichment pipeline.
 */
export function buildDiagnosePrompt(platform: string): string {
  const platformLower = platform.toLowerCase();

  const platformEnricherMap: Record<string, string> = {
    youtube:   "enrichers/youtube.ts",
    roblox:    "enrichers/roblox.ts",
    twitch:    "enrichers/twitch.ts",
    discord:   "enrichers/discord.ts",
    instagram: "enrichers/instagram.ts",
  };

  const enricherFile = platformEnricherMap[platformLower] ?? `enrichers/${platformLower}.ts`;

  const platformEnvVars: Record<string, string[]> = {
    youtube:   ["YOUTUBE_API_KEY"],
    roblox:    [],
    twitch:    ["TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET"],
    discord:   ["DISCORD_BOT_TOKEN"],
    instagram: [],
  };

  const envVars = platformEnvVars[platformLower] ?? ["(unknown — check enricher source)"];

  return `
Diagnose the FamilyShield ${platform} enrichment pipeline.

## Diagnostic steps

### 1. Read the enricher code
Read ${enricherFile}
- Understand what API calls it makes
- Identify potential failure points
- Check timeout values and error handling

### 2. Check environment variables
The ${platform} enricher requires these env vars:
${envVars.length > 0 ? envVars.map((v) => `- ${v}`).join("\n") : "- (no API auth required — public API)"}

Check if they are set:
${envVars.map((v) => `bash -c "echo ${v}: \${${v}:+SET}"` ).join("\n") || "bash -c \"echo No auth required for this platform\""}

### 3. Test a live API call
Read the enricher to understand the API endpoints, then make a test curl call:
- For YouTube: curl "https://www.googleapis.com/youtube/v3/videos?id=dQw4w9WgXcQ&part=snippet&key=$YOUTUBE_API_KEY"
- For Roblox: curl "https://games.roblox.com/v1/games?universeIds=3290543031"
- For Twitch: First get an OAuth token, then call the streams endpoint
- For Discord: curl -H "Authorization: Bot $DISCORD_BOT_TOKEN" "https://discord.com/api/v10/guilds/[guild_id]"

### 4. Check recent ${platform} events in Supabase
Query the content_events table filtering by platform = '${platformLower}':
curl -s -H "apikey: $SUPABASE_SERVICE_KEY" \\
     -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \\
     "$SUPABASE_URL/rest/v1/content_events?platform=eq.${platformLower}&order=captured_at.desc&limit=10"

### 5. Check log errors for ${platform}
Search recent logs for enrichment errors specific to ${platform}:
bash -c "docker logs familyshield-api 2>&1 | grep -i '${platformLower}' | tail -20" 2>/dev/null

### 6. Risk score quality check
Look at the last 10 ${platform} events. Are the risk scores sensible?
Are the titles/descriptions being populated correctly?
Is mature_flag being set appropriately?

## Report format

Provide:
1. **Enricher status**: Working / Degraded / Broken
2. **Root cause** (if broken): Specific error + likely fix
3. **API response quality**: Title/description populated? Age flags working?
4. **Risk score quality**: Scores making sense for ${platform} content?
5. **Recommended fix**: Exact code change or config change needed

If the enricher is working correctly, say so clearly and provide stats.
`.trim();
}
