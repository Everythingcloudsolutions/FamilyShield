/**
 * FamilyShield agent-mitm — Task: test-capture {url}
 *
 * Dry-runs the addon URL matching logic against a given URL.
 * Simulates exactly what familyshield_addon.py would do when it sees that
 * URL, without sending any real traffic.
 *
 * This lets Mohit verify that a new YouTube URL format, Roblox API endpoint,
 * etc. would be captured before it goes live.
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import type { CaptureTestResult } from "../types.js";

// ── Mirror the Python addon's PLATFORM_PATTERNS in TypeScript ────────────────
// Each entry: [regex, contentType, captureGroupIndex]
type PatternEntry = [RegExp, string, number];

const PLATFORM_PATTERNS: Record<string, PatternEntry[]> = {
  youtube: [
    [/youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/, "video", 1],
    [/youtube\.com\/shorts\/([\w-]{11})/, "short", 1],
    [/youtubei\.googleapis\.com\/.*videoId%3D([\w-]{11})/, "video", 1],
    [/youtubei\.googleapis\.com\/.*shorts.*videoId[%3D:"']+?([\w-]{11})/, "short", 1],
  ],
  roblox: [
    [/roblox\.com\/games\/(\d{6,})/, "game", 1],
    [/roblox\.com\/.*[?&]placeId=(\d{6,})/, "game", 1],
    [/roblox\.com\/.*joinscript.*placeId=(\d{6,})/, "game", 1],
  ],
  discord: [
    [/discord\.com\/api\/v\d+\/channels\/(\d{15,})/, "channel", 1],
    [/discord\.com\/api\/v\d+\/guilds\/(\d{15,})/, "guild", 1],
    [/discord\.com\/api\/v\d+\/channels\/(\d{15,})\/messages/, "channel", 1],
  ],
  twitch: [
    [/twitch\.tv\/([a-zA-Z0-9_]{4,25})(?:\/|$)(?!directory|clips|videos)/, "stream", 1],
    [/gql\.twitch\.tv.*"login":"([a-zA-Z0-9_]{4,25})"/, "stream", 1],
  ],
  instagram: [
    [/instagram\.com\/reels?\/([A-Za-z0-9_-]{10,})/, "reel", 1],
    [/instagram\.com\/p\/([A-Za-z0-9_-]{10,})/, "post", 1],
  ],
};

// Per-platform host allow-lists (mirrors Python's _host_matches_platform)
const PLATFORM_HOSTS: Record<string, string[]> = {
  youtube:   ["youtube.com", "youtu.be", "youtubei.googleapis.com", "googlevideo.com"],
  roblox:    ["roblox.com", "rbxcdn.com"],
  discord:   ["discord.com", "discord.gg", "discordapp.com"],
  twitch:    ["twitch.tv", "twitchapps.com", "gql.twitch.tv"],
  instagram: ["instagram.com", "cdninstagram.com"],
};

// Hosts the addon ignores entirely
const IGNORE_HOSTS = new Set([
  "apple.com", "icloud.com", "apple-cloudkit.com",
  "googleapis.com", "gstatic.com",
  "microsoft.com", "windows.com", "windowsupdate.com",
  "ocsp.digicert.com", "ocsp.sectigo.com",
  "familyshield-dev.everythingcloud.ca",
  "familyshield-staging.everythingcloud.ca",
  "familyshield.everythingcloud.ca",
]);

/**
 * Simulate whether the mitmproxy addon would capture a given URL.
 * Returns a CaptureTestResult — no network calls, pure logic.
 */
export function testCapture(rawUrl: string): CaptureTestResult {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
  } catch {
    return {
      url:            rawUrl,
      wouldCapture:   false,
      platform:       null,
      contentType:    null,
      extractedId:    null,
      matchedPattern: null,
      reason:         "Invalid URL — could not parse. Ensure the URL includes the scheme (https://...).",
    };
  }

  const host = parsed.hostname;
  const url  = parsed.href;
  const path = parsed.pathname + parsed.search;

  // Check ignored hosts
  for (const ignored of IGNORE_HOSTS) {
    if (host === ignored || host.endsWith(`.${ignored}`)) {
      return {
        url,
        wouldCapture:   false,
        platform:       null,
        contentType:    null,
        extractedId:    null,
        matchedPattern: null,
        reason:         `Host "${host}" is in IGNORE_HOSTS — addon skips it entirely.`,
      };
    }
  }

  // Try each platform
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    const allowedHosts = PLATFORM_HOSTS[platform] ?? [];
    const hostMatches  = allowedHosts.some(
      (h) => host === h || host.endsWith(`.${h}`),
    );

    if (!hostMatches) continue;

    for (const [regex, contentType, groupIdx] of patterns) {
      // Try full URL first, then path
      const match = regex.exec(url) ?? regex.exec(path);

      if (match) {
        const extractedId = match[groupIdx] ?? null;
        return {
          url,
          wouldCapture:   true,
          platform,
          contentType,
          extractedId,
          matchedPattern: regex.source,
          reason:         `MATCH — platform "${platform}", type "${contentType}", id="${extractedId ?? "none"}"`,
        };
      }
    }

    // Host matched the platform but no pattern hit
    return {
      url,
      wouldCapture:   false,
      platform,
      contentType:    null,
      extractedId:    null,
      matchedPattern: null,
      reason:         `Host is a ${platform} domain but no URL pattern matched. ` +
                      `This could be an API endpoint not yet covered, or a content type ` +
                      `the addon doesn't track (e.g., search pages, home feed).`,
    };
  }

  // No platform matched
  return {
    url,
    wouldCapture:   false,
    platform:       null,
    contentType:    null,
    extractedId:    null,
    matchedPattern: null,
    reason:         `Host "${host}" does not match any tracked platform. ` +
                    `The addon will process the response but emit no event.`,
  };
}
