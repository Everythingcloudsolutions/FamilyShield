/**
 * Task: add-enricher
 * ==================
 * Builds the prompt for guiding the addition of a new platform enricher.
 * The agent reads existing enrichers for patterns, reviews the platform's API,
 * and proposes a new enricher following FamilyShield conventions.
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

/** Known platforms and their API details */
interface PlatformInfo {
  apiName: string;
  authRequired: string;
  contentIdType: string;
  baseUrl: string;
  notes: string;
}

const KNOWN_PLATFORMS: Record<string, PlatformInfo> = {
  instagram: {
    apiName: "Meta Graph API / Basic Display API",
    authRequired: "Meta App + OAuth token (very restricted)",
    contentIdType: "media_id or shortcode (browser-only capture)",
    baseUrl: "https://graph.instagram.com/",
    notes: "No public API for content lookup. Risk assessment is time-of-day based only. Return early with time-based risk.",
  },
  tiktok: {
    apiName: "TikTok Research API",
    authRequired: "TikTok Developer account (restricted access)",
    contentIdType: "video_id",
    baseUrl: "https://open.tiktokapis.com/",
    notes: "TikTok uses certificate pinning — mitmproxy cannot intercept. FamilyShield blocks TikTok at DNS level for <14. The enricher should reflect DNS-block-only status.",
  },
  snapchat: {
    apiName: "Snap Kit",
    authRequired: "Snapchat Developer account",
    contentIdType: "snap_id",
    baseUrl: "https://kit.snapchat.com/",
    notes: "Very limited public API. Consider time-based enrichment only.",
  },
  minecraft: {
    apiName: "Mojang API",
    authRequired: "None (public)",
    contentIdType: "server_ip or world_name",
    baseUrl: "https://api.mojang.com/",
    notes: "Server lookup possible via Mojang API. Consider age rating based on server type.",
  },
  steam: {
    apiName: "Steam Web API",
    authRequired: "STEAM_API_KEY (free developer key)",
    contentIdType: "appid",
    baseUrl: "https://api.steampowered.com/",
    notes: "App details include age rating, genres, content descriptors. Very useful for risk scoring.",
  },
};

export function buildAddEnricherPrompt(platform: string): string {
  const platformLower = platform.toLowerCase();
  const knownInfo = KNOWN_PLATFORMS[platformLower];

  const platformContext = knownInfo
    ? `
## Known information about ${platform}

| Field | Value |
|-------|-------|
| API   | ${knownInfo.apiName} |
| Auth  | ${knownInfo.authRequired} |
| Content ID type | ${knownInfo.contentIdType} |
| Base URL | ${knownInfo.baseUrl} |
| Notes | ${knownInfo.notes} |
`
    : `
## Platform ${platform}

This is a platform not in the standard FamilyShield known list.
Research the platform's public API, content ID format, and auth requirements before proposing an enricher.
`;

  return `
Guide the addition of a new enricher for platform: ${platform}

## Your approach

1. **Read existing enrichers first** — understand the patterns:
   - Read enrichers/youtube.ts (most complete example)
   - Read enrichers/roblox.ts (no-auth example)
   - Read enrichers/index.ts (router — needs updating)
   - Read ../types.ts if it exists (RawContentEvent + EnrichedEvent shapes)

2. **Understand the enricher contract**:
   - Input:  RawContentEvent (device_ip, platform, content_type, content_id, ...)
   - Output: Promise<EnrichedEvent>
   - Must handle missing API keys gracefully (console.warn + fallback)
   - Must use axios with 5s timeout
   - Must not throw — return base event on any error
   - All descriptions sliced to 500 chars

${platformContext}

3. **Propose the enricher file**: enrichers/${platformLower}.ts
   - Follow the exact same structure as youtube.ts or roblox.ts
   - No "any" types — use proper TypeScript
   - Add the env var reference at the top (e.g., const PLATFORM_API_KEY = process.env.PLATFORM_API_KEY)
   - Export a single named function: enrich${platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase()}

4. **Update the router**: enrichers/index.ts
   - Import the new function
   - Add a case to the switch statement
   - Match the platform name exactly (lowercase, as it comes from mitmproxy)

5. **Update environment variables**:
   - Note which env vars need to be added to .env.example
   - Note which GitHub Secrets need adding for CI/CD

6. **Risk scoring considerations**:
   - What fields from the ${platform} API are most useful for risk scoring?
   - Should this platform ever be blocked outright at DNS level?
   - What age profile (6-10, 11-14, 15-17) is this relevant for?

## Important constraints

- Do NOT commit any code changes — propose them, explain them, and let the developer review
- Always test with a real content ID using test-enricher before suggesting a commit
- If the platform has no public API (like Instagram), implement a time-based enricher that:
  - Returns category: "social" or appropriate category
  - Sets mature_flag based on time-of-day heuristics (late night = higher risk)
  - Notes in a comment why no API enrichment is possible

Propose the full implementation now.
`.trim();
}
