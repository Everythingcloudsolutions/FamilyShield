/**
 * FamilyShield Shared TypeScript Types
 * Core event and enrichment types used across the platform
 */

/**
 * Raw content event extracted by mitmproxy addon from HTTPS streams.
 * Minimal: just the identifiers needed to query platform APIs for enrichment.
 */
export interface RawContentEvent {
  device_ip: string;
  platform: 'youtube' | 'roblox' | 'discord' | 'twitch' | 'instagram' | 'tiktok' | 'other';
  content_type: string; // 'video', 'game', 'message', 'stream', 'post', etc.
  content_id: string; // video_id, game_place_id, guild_id, etc.
  timestamp: number; // unix seconds
  environment: 'dev' | 'staging' | 'prod';
}

/**
 * Enriched event with platform API metadata.
 * Result of calling platform APIs (YouTube Data, Roblox, Discord, Twitch).
 */
export interface EnrichedEvent extends RawContentEvent {
  // Core metadata
  title?: string;
  description?: string;
  category?: string;
  creator?: string;
  channel_name?: string;   // YouTube channel, Roblox creator, Twitch username
  thumbnail_url?: string;

  // Content classification
  age_restricted?: boolean; // YouTube age gate, Roblox 17+
  mature_flag?: boolean;    // Twitch is_mature, Discord nsfw flag
  language?: string;
  tags?: string[];

  // Engagement metrics
  duration_seconds?: number;
  view_count?: number;
  like_count?: number;
  player_count?: number;   // Roblox: game.playing
  viewer_count?: number;   // Twitch: stream.viewer_count
  is_live?: boolean;
  upload_date?: string;

  // Legacy — kept for backwards compat
  maturity_rating?: 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17' | 'restricted' | 'unknown';
  nsfw_probability?: number; // 0-1

  // AI risk scoring (added by event consumer after enrichment)
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  risk_categories?: string[];
  risk_confidence?: number; // 0-1
  ai_provider?: 'groq' | 'anthropic' | 'cached';
}

/**
 * Risk scoring response from LLM (Groq or Anthropic).
 */
export interface RiskScoringResult {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  categories: string[];
  confidence: number; // 0-1
  reasoning?: string;
  provider: 'groq' | 'anthropic';
}

/**
 * Alert triggered when risk threshold is exceeded.
 */
export interface RiskAlert {
  device_ip: string;
  platform: string;
  content_id: string;
  title: string;
  risk_level: string;
  timestamp: string;
  alert_id?: string;
}
