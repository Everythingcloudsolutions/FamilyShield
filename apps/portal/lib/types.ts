/**
 * Portal-specific TypeScript types
 * Mirrors Supabase table schemas — keep in sync with database.
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type Platform = 'youtube' | 'roblox' | 'discord' | 'twitch' | 'instagram' | 'tiktok' | 'other';
export type DeviceProfile = 'strict' | 'moderate' | 'guided'; // 6-10, 11-14, 15-17

export interface ContentEvent {
  id: string;
  device_ip: string;
  platform: Platform;
  content_type: string;
  content_id: string;
  title: string | null;
  category: string | null;
  risk_level: RiskLevel | null;
  risk_categories: string[] | null;
  risk_confidence: number | null;
  ai_provider: 'groq' | 'anthropic' | 'cached' | null;
  environment: string;
  captured_at: string; // ISO 8601
}

export interface Alert {
  id: string;
  device_ip: string;
  platform: Platform;
  content_id: string;
  title: string;
  risk_level: RiskLevel;
  risk_categories: string[] | null;
  risk_confidence: number | null;
  ai_provider: string | null;
  dispatched_via: string[];
  environment: string;
  created_at: string; // ISO 8601
}

export interface Device {
  device_ip: string;
  device_name: string;
  profile: DeviceProfile;
  enrolled_at: string; // ISO 8601
  last_seen?: string;
}

export interface DashboardStats {
  total_devices: number;
  events_today: number;
  alerts_today: number;
  top_platform: Platform | null;
}
