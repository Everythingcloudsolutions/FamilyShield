/**
 * Platform Enricher Router
 * Calls the right platform API based on the event platform field
 */

import type { RawContentEvent, EnrichedEvent } from "../types";
import { enrichYouTube } from "./youtube";
import { enrichRoblox } from "./roblox";
import { enrichTwitch } from "./twitch";
import { enrichDiscord } from "./discord";

export async function enrichEvent(
  raw: RawContentEvent
): Promise<EnrichedEvent | null> {
  const base: Partial<EnrichedEvent> = {
    ...raw,
    title: undefined,
    description: undefined,
    category: undefined,
    age_restricted: false,
    mature_flag: false,
  };

  try {
    switch (raw.platform) {
      case "youtube":
        return enrichYouTube(raw, base);
      case "roblox":
        return enrichRoblox(raw, base);
      case "twitch":
        return enrichTwitch(raw, base);
      case "discord":
        return enrichDiscord(raw, base);
      case "instagram":
        // No public API — return with URL metadata only
        return {
          ...base,
          title: `Instagram ${raw.content_type}`,
          category: "social",
        } as EnrichedEvent;
      default:
        return base as EnrichedEvent;
    }
  } catch (err) {
    console.error(`Enrichment failed for ${raw.platform}/${raw.content_id}:`, err);
    return base as EnrichedEvent;
  }
}
