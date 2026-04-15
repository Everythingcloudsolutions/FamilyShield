/**
 * Alert Dispatcher
 * Sends push notifications and persists alerts when risk thresholds are exceeded.
 * Channels: ntfy (HTTP push), Supabase alerts table, Redis deduplication.
 */

import axios from 'axios';
import type { Logger } from 'pino';
import type { EnrichedEvent } from '../types';
import type { RedisClientType } from 'redis';
import type { SupabaseClient } from '@supabase/supabase-js';

interface DispatcherDeps {
  redis: RedisClientType;
  supabase: SupabaseClient;
  log: Logger;
}

const NTFY_URL = process.env.NTFY_URL ?? 'https://ntfy.sh';
const NTFY_TOPIC = process.env.NTFY_TOPIC ?? 'familyshield-alerts';
const ALERT_DEDUP_TTL_SEC = 300; // Suppress duplicate alerts for 5 minutes

// ntfy priority maps to risk level
const NTFY_PRIORITY: Record<string, string> = {
  critical: 'urgent',
  high: 'high',
  medium: 'default',
  low: 'min',
};

export async function dispatchAlert(
  event: EnrichedEvent,
  deps: DispatcherDeps,
): Promise<void> {
  const { redis, supabase, log } = deps;

  // Deduplicate: same device + same content ID within TTL window
  const dedupKey = `alert:dedup:${event.device_ip}:${event.content_id}`;
  const alreadySent = await redis.get(dedupKey);
  if (alreadySent) {
    log.debug({ content_id: event.content_id, device: event.device_ip }, 'Alert suppressed (dedup)');
    return;
  }

  const riskLabel = event.risk_level?.toUpperCase() ?? 'UNKNOWN';
  const title = `${riskLabel}: ${event.platform} — ${(event.title ?? event.content_id).slice(0, 60)}`;
  const body = [
    `Device: ${event.device_ip}`,
    `Category: ${event.category ?? 'unknown'}`,
    `Risk flags: ${event.risk_categories?.join(', ') ?? 'none'}`,
    `Confidence: ${((event.risk_confidence ?? 0) * 100).toFixed(0)}%`,
  ].join(' · ');

  const dispatched: string[] = [];

  // 1. ntfy push notification
  try {
    await axios.post(`${NTFY_URL}/${NTFY_TOPIC}`, body, {
      headers: {
        Title: title,
        Priority: NTFY_PRIORITY[event.risk_level ?? 'medium'] ?? 'default',
        Tags: ['shield', event.platform],
        'Content-Type': 'text/plain',
      },
      timeout: 5000,
    });
    dispatched.push('ntfy');
    log.info({ content_id: event.content_id }, 'ntfy alert sent');
  } catch (err) {
    log.error({ err }, 'ntfy dispatch failed — continuing to Supabase');
  }

  // 2. Persist to Supabase alerts table (consumed by portal Realtime subscription)
  const { error } = await supabase.from('alerts').insert({
    device_ip:      event.device_ip,
    platform:       event.platform,
    content_id:     event.content_id,
    title:          event.title ?? event.content_id,
    risk_level:     event.risk_level,
    risk_categories: event.risk_categories ?? [],
    risk_confidence: event.risk_confidence,
    ai_provider:    event.ai_provider,
    dispatched_via: dispatched,
    environment:    event.environment,
    created_at:     new Date().toISOString(),
  });

  if (error) {
    log.error({ error }, 'Supabase alert insert failed');
  } else {
    dispatched.push('supabase');
  }

  // 3. Mark dedup key so we don't spam the same alert
  await redis.setEx(dedupKey, ALERT_DEDUP_TTL_SEC, '1');

  log.warn(
    {
      platform:   event.platform,
      content_id: event.content_id,
      risk_level: event.risk_level,
      device:     event.device_ip,
      dispatched_via: dispatched,
    },
    'Alert dispatched',
  );
}
