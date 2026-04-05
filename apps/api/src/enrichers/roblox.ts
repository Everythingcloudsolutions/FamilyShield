/**
 * Roblox Open API Enricher
 * No auth required — fully public API
 */
import axios from "axios";
import type { RawContentEvent, EnrichedEvent } from "../types";

export async function enrichRoblox(
  raw: RawContentEvent,
  base: Partial<EnrichedEvent>
): Promise<EnrichedEvent> {
  const response = await axios.get(
    `https://games.roblox.com/v1/games?universeIds=${raw.content_id}`,
    { timeout: 5000 }
  );

  const game = response.data?.data?.[0];
  if (!game) return base as EnrichedEvent;

  // Get age recommendations from separate endpoint
  let ageRecommendation = "All ages";
  try {
    const ageRes = await axios.get(
      `https://games.roblox.com/v1/games/${raw.content_id}/age-recommendations`,
      { timeout: 3000 }
    );
    ageRecommendation = ageRes.data?.ageRecommendationDisplayName ?? "All ages";
  } catch { /* non-critical */ }

  return {
    ...base,
    title:         game.name,
    description:   (game.description ?? "").slice(0, 500),
    category:      game.genre ?? "Gaming",
    channel_name:  game.creator?.name,
    age_restricted: ageRecommendation.includes("17+"),
    mature_flag:   ageRecommendation.includes("17+"),
    player_count:  game.playing,
  } as EnrichedEvent;
}
