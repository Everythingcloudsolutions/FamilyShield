/**
 * YouTube Data API v3 Enricher
 * Fetches video title, category, description, and age restriction flag
 * Free tier: 10,000 units/day (1 unit per video lookup)
 */

import axios from "axios";
import type { RawContentEvent, EnrichedEvent } from "../types";

const YT_API_KEY = process.env.YOUTUBE_API_KEY;
const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

// YouTube category IDs → human-readable names
const CATEGORY_MAP: Record<string, string> = {
  "1": "Film & Animation",
  "2": "Autos & Vehicles",
  "10": "Music",
  "15": "Pets & Animals",
  "17": "Sports",
  "19": "Travel & Events",
  "20": "Gaming",
  "22": "People & Blogs",
  "23": "Comedy",
  "24": "Entertainment",
  "25": "News & Politics",
  "26": "Howto & Style",
  "27": "Education",
  "28": "Science & Technology",
  "29": "Nonprofits & Activism",
};

export async function enrichYouTube(
  raw: RawContentEvent,
  base: Partial<EnrichedEvent>
): Promise<EnrichedEvent> {
  if (!YT_API_KEY) {
    console.warn("YOUTUBE_API_KEY not set — returning base event");
    return { ...base, title: `YouTube video ${raw.content_id}`, category: "video" } as EnrichedEvent;
  }

  const response = await axios.get(`${YT_API_BASE}/videos`, {
    params: {
      id: raw.content_id,
      part: "snippet,contentDetails,contentRating,status",
      key: YT_API_KEY,
    },
    timeout: 5000,
  });

  const item = response.data?.items?.[0];
  if (!item) {
    return base as EnrichedEvent;
  }

  const snippet = item.snippet ?? {};
  const contentRating = item.contentRating ?? {};
  const categoryId = snippet.categoryId ?? "24";

  return {
    ...base,
    title:         snippet.title,
    description:   (snippet.description ?? "").slice(0, 500),
    category:      CATEGORY_MAP[categoryId] ?? "Entertainment",
    channel_name:  snippet.channelTitle,
    age_restricted: contentRating.ytRating === "ytAgeRestricted",
    mature_flag:   contentRating.ytRating === "ytAgeRestricted",
    thumbnail_url: snippet.thumbnails?.medium?.url,
  } as EnrichedEvent;
}
