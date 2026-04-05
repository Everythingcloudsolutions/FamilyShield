/**
 * Discord API Enricher
 * Fetches server name and NSFW channel flag
 * Requires: DISCORD_BOT_TOKEN (free bot account)
 */
import axios from "axios";
import type { RawContentEvent, EnrichedEvent } from "../types";

const DISCORD_BASE = "https://discord.com/api/v10";

export async function enrichDiscord(
  raw: RawContentEvent,
  base: Partial<EnrichedEvent>
): Promise<EnrichedEvent> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return base as EnrichedEvent;

  const headers = { Authorization: `Bot ${token}` };

  if (raw.content_type === "guild") {
    const response = await axios.get(`${DISCORD_BASE}/guilds/${raw.content_id}`, {
      headers,
      timeout: 5000,
    });
    const guild = response.data;
    return {
      ...base,
      title:       guild.name,
      category:    "Social — Discord Server",
      mature_flag: guild.nsfw_level >= 2,
    } as EnrichedEvent;
  }

  if (raw.content_type === "channel") {
    const response = await axios.get(`${DISCORD_BASE}/channels/${raw.content_id}`, {
      headers,
      timeout: 5000,
    });
    const channel = response.data;
    return {
      ...base,
      title:       `#${channel.name}`,
      category:    "Social — Discord Channel",
      mature_flag: channel.nsfw ?? false,
    } as EnrichedEvent;
  }

  return base as EnrichedEvent;
}
