/**
 * Task: test-enricher
 * ====================
 * Builds the prompt for testing a specific enricher against a real content ID.
 * The agent reads the enricher code, makes live API calls, and validates
 * the expected output structure.
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

/** Well-known safe content IDs for each platform (used as examples) */
const EXAMPLE_CONTENT_IDS: Record<string, { id: string; description: string }> = {
  youtube:   { id: "dQw4w9WgXcQ", description: "Rick Astley - Never Gonna Give You Up" },
  roblox:    { id: "3290543031",   description: "Adopt Me! (popular family game)" },
  twitch:    { id: "ninja",        description: "Ninja (gaming streamer)" },
  discord:   { id: "YOUR_GUILD_ID", description: "Replace with a real guild ID your bot is in" },
  instagram: { id: "CxYZ123abc",   description: "Example reel ID (no API available)" },
};

export function buildTestEnricherPrompt(platform: string, contentId: string): string {
  const platformLower = platform.toLowerCase();

  const enricherFileMap: Record<string, string> = {
    youtube:   "enrichers/youtube.ts",
    roblox:    "enrichers/roblox.ts",
    twitch:    "enrichers/twitch.ts",
    discord:   "enrichers/discord.ts",
    instagram: "enrichers/instagram.ts",
  };

  const enricherFile = enricherFileMap[platformLower] ?? `enrichers/${platformLower}.ts`;
  const example = EXAMPLE_CONTENT_IDS[platformLower];

  // Build expected output fields by platform
  const expectedFields: Record<string, string[]> = {
    youtube: [
      "title (video title from YouTube snippet)",
      "description (first 500 chars of video description)",
      "category (human-readable from CATEGORY_MAP)",
      "channel_name (channelTitle from snippet)",
      "age_restricted (boolean from contentRating.ytRating)",
      "mature_flag (same as age_restricted)",
      "thumbnail_url (medium thumbnail URL)",
    ],
    roblox: [
      "title (game name)",
      "description (first 500 chars)",
      "category (genre from Roblox or 'Gaming')",
      "channel_name (creator name)",
      "age_restricted (true if ageRecommendation includes '17+')",
      "mature_flag (same as age_restricted)",
      "player_count (current playing count)",
    ],
    twitch: [
      "title (channel: stream title)",
      "description (stream title)",
      "category (game_name or 'Gaming')",
      "mature_flag (is_mature from stream data)",
      "viewer_count (current viewers)",
    ],
    discord: [
      "title (guild name or #channel-name)",
      "category ('Social — Discord Server' or 'Social — Discord Channel')",
      "mature_flag (nsfw_level >= 2 for guilds, nsfw for channels)",
    ],
    instagram: [
      "title ('Instagram reel' or similar fallback)",
      "category ('social')",
      "(no API — time-based enrichment only)",
    ],
  };

  const fields = expectedFields[platformLower] ?? [
    "title",
    "description",
    "category",
    "age_restricted",
    "mature_flag",
  ];

  return `
Test the FamilyShield ${platform} enricher with content ID: ${contentId}

${example ? `Note: A well-known example for ${platform} is:\n- ID: ${example.id}\n- Content: ${example.description}\n` : ""}

## Step 1: Read the enricher code

Read ${enricherFile}
Understand:
- What API endpoint does it call?
- What parameters does it pass?
- How does it map the API response to EnrichedEvent fields?
- What can go wrong?

## Step 2: Make the raw API call

Replicate what the enricher does with a direct curl call, using the content ID: ${contentId}

For ${platformLower}:
${buildRawApiCurlExample(platformLower, contentId)}

## Step 3: Validate the response

Check the raw API response:
1. Does the content ID exist?
2. Are all expected fields present in the API response?
3. Are there any null/missing fields that the enricher needs to handle?
4. Is the age/mature flag being set correctly?

## Step 4: Expected enricher output

After enrichment, the EnrichedEvent should have these fields populated:
${fields.map((f) => `- ${f}`).join("\n")}

## Step 5: Risk assessment preview

Based on the metadata, what risk_level would you expect the AI to assign?
- Title suggests: [low/medium/high/critical]?
- Category: [educational/gaming/entertainment/etc.]?
- Age flag: [yes/no]?
- Mature flag: [yes/no]?

## Step 6: Final verdict

State clearly:
- **PASS**: Enricher returns correct, complete metadata for this content ID
- **PARTIAL**: Some fields missing or incorrect — describe what
- **FAIL**: Enricher fails entirely — describe the error and fix

If PARTIAL or FAIL, propose the specific code fix in ${enricherFile}.
`.trim();
}

/**
 * Build a platform-specific curl example for the raw API call.
 */
function buildRawApiCurlExample(platform: string, contentId: string): string {
  switch (platform) {
    case "youtube":
      return `curl -s "https://www.googleapis.com/youtube/v3/videos?id=${contentId}&part=snippet,contentDetails,contentRating,status&key=$YOUTUBE_API_KEY" | head -100`;

    case "roblox":
      return [
        `# Game details (no auth required):`,
        `curl -s "https://games.roblox.com/v1/games?universeIds=${contentId}"`,
        ``,
        `# Age recommendation:`,
        `curl -s "https://games.roblox.com/v1/games/${contentId}/age-recommendations"`,
      ].join("\n");

    case "twitch": {
      return [
        `# Step 1: Get OAuth token`,
        `TOKEN=$(curl -s -X POST "https://id.twitch.tv/oauth2/token" \\`,
        `  -d "client_id=$TWITCH_CLIENT_ID&client_secret=$TWITCH_CLIENT_SECRET&grant_type=client_credentials" \\`,
        `  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")`,
        ``,
        `# Step 2: Check stream status for channel: ${contentId}`,
        `curl -s -H "Client-ID: $TWITCH_CLIENT_ID" \\`,
        `     -H "Authorization: Bearer $TOKEN" \\`,
        `     "https://api.twitch.tv/helix/streams?user_login=${contentId}"`,
      ].join("\n");
    }

    case "discord":
      return [
        `# Check guild (replace ${contentId} with a guild ID your bot has access to):`,
        `curl -s -H "Authorization: Bot $DISCORD_BOT_TOKEN" \\`,
        `     "https://discord.com/api/v10/guilds/${contentId}"`,
        ``,
        `# Or check a channel:`,
        `curl -s -H "Authorization: Bot $DISCORD_BOT_TOKEN" \\`,
        `     "https://discord.com/api/v10/channels/${contentId}"`,
      ].join("\n");

    case "instagram":
      return `# Instagram has no public API for content lookup.
# The enricher returns time-based metadata only.
# No curl test possible — return expected fallback values.
echo "Instagram: no public API. Enricher returns time-based risk only."`;

    default:
      return `# Check the enricher source for the API endpoint, then build your curl command.
# Content ID: ${contentId}`;
  }
}
