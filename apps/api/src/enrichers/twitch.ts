/**
 * Twitch API Enricher
 * Fetches stream title, game, and mature content flag
 * Requires: TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET (free developer account)
 */
import axios from "axios";
import type { RawContentEvent, EnrichedEvent } from "../types";

let twitchToken: string | null = null;
let tokenExpiry = 0;

async function getTwitchToken(): Promise<string> {
  if (twitchToken && Date.now() < tokenExpiry) return twitchToken;

  const response = await axios.post("https://id.twitch.tv/oauth2/token", null, {
    params: {
      client_id:     process.env.TWITCH_CLIENT_ID,
      client_secret: process.env.TWITCH_CLIENT_SECRET,
      grant_type:    "client_credentials",
    },
  });

  twitchToken = response.data.access_token;
  tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
  return twitchToken!;
}

export async function enrichTwitch(
  raw: RawContentEvent,
  base: Partial<EnrichedEvent>
): Promise<EnrichedEvent> {
  const token = await getTwitchToken();

  const response = await axios.get("https://api.twitch.tv/helix/streams", {
    params: { user_login: raw.content_id },
    headers: {
      "Client-ID": process.env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${token}`,
    },
    timeout: 5000,
  });

  const stream = response.data?.data?.[0];
  if (!stream) {
    // Streamer is offline — get channel info instead
    return { ...base, title: `${raw.content_id} (offline)`, category: "Gaming" } as EnrichedEvent;
  }

  return {
    ...base,
    title:       `${raw.content_id}: ${stream.title}`,
    description: stream.title,
    category:    stream.game_name ?? "Gaming",
    mature_flag: stream.is_mature ?? false,
    viewer_count: stream.viewer_count,
  } as EnrichedEvent;
}
