import { Alert, Device } from './types'
import { isSupabaseConfigured } from './supabase'

export const DEMO_DEVICES: Device[] = [
  {
    device_ip: '192.168.1.50',
    device_name: "Emma's iPad",
    profile: 'strict',
    enrolled_at: '2026-04-10T08:30:00Z',
    last_seen: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    device_ip: '192.168.1.51',
    device_name: "Noah's Laptop",
    profile: 'moderate',
    enrolled_at: '2026-04-12T14:15:00Z',
    last_seen: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    device_ip: '192.168.1.52',
    device_name: "Sophie's Phone",
    profile: 'guided',
    enrolled_at: '2026-04-14T10:45:00Z',
    last_seen: new Date(Date.now() - 8 * 60000).toISOString(),
  },
]

export const DEMO_ALERTS: Alert[] = [
  {
    id: 'demo-1',
    device_ip: '192.168.1.50',
    platform: 'youtube',
    content_id: 'violent-mod-pack',
    title: 'Minecraft violent mod pack gameplay',
    risk_level: 'high',
    risk_categories: ['violence', 'graphic'],
    risk_confidence: 0.92,
    ai_provider: 'groq',
    dispatched_via: ['ntfy'],
    environment: 'dev',
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: 'demo-2',
    device_ip: '192.168.1.50',
    platform: 'discord',
    content_id: 'guild-12345',
    title: 'Late-night Discord gaming server (18+)',
    risk_level: 'critical',
    risk_categories: ['mature_content', 'inappropriate_peers'],
    risk_confidence: 0.88,
    ai_provider: 'anthropic',
    dispatched_via: ['ntfy'],
    environment: 'dev',
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: 'demo-3',
    device_ip: '192.168.1.51',
    platform: 'roblox',
    content_id: 'place-98765432',
    title: 'Roblox 17+ survival game',
    risk_level: 'medium',
    risk_categories: ['age_inappropriate'],
    risk_confidence: 0.76,
    ai_provider: 'groq',
    dispatched_via: [],
    environment: 'dev',
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 'demo-4',
    device_ip: '192.168.1.51',
    platform: 'twitch',
    content_id: 'channel-streamer',
    title: 'Adult stream (mature ratings)',
    risk_level: 'low',
    risk_categories: ['mature_rating'],
    risk_confidence: 0.68,
    ai_provider: 'groq',
    dispatched_via: [],
    environment: 'dev',
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 'demo-5',
    device_ip: '192.168.1.52',
    platform: 'instagram',
    content_id: 'reel-67890',
    title: 'Instagram Reel (inappropriate content)',
    risk_level: 'high',
    risk_categories: ['sexual_content'],
    risk_confidence: 0.85,
    ai_provider: 'anthropic',
    dispatched_via: ['ntfy'],
    environment: 'dev',
    created_at: new Date(Date.now() - 3 * 60000).toISOString(),
  },
]

export function isDemoMode(alerts: Alert[], devices: Device[]): boolean {
  return !isSupabaseConfigured() && alerts.length === 0 && devices.length === 0
}
