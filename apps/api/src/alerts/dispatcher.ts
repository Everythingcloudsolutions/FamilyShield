/**
 * Alert Dispatcher
 * Sends notifications when risk thresholds are exceeded.
 * Phase 1: Placeholder. Phase 2: Integrate with ntfy (self-hosted),
 * Discord webhooks, and Supabase Realtime subscriptions.
 */

import type { Logger } from 'pino';
import type { EnrichedEvent } from '../types';
import type { RedisClientType } from 'redis';
import type { SupabaseClient } from '@supabase/supabase-js';

interface DispatcherDeps {
  redis: RedisClientType;
  supabase: SupabaseClient;
  log: Logger;
}

/**
 * Dispatch an alert for high-risk content.
 * Methods: ntfy, Discord webhook, Supabase Realtime (via portal real-time subscriptions).
 */
export async function dispatchAlert(
  event: EnrichedEvent,
  deps: DispatcherDeps,
): Promise<void> {
  const { redis, supabase, log } = deps;

  log.warn(
    {
      platform: event.platform,
      content_id: event.content_id,
      risk_level: event.risk_level,
      device: event.device_ip,
    },
    'Dispatching risk alert',
  );

  // Phase 1 placeholder: Log only. Full implementation in Phase 2:
  // - ntfy HTTP POST to /publish/{topic}
  // - Discord webhook POST
  // - Supabase alert_queue INSERT for real-time portal updates
  // - Redis alert deduplication (prevent spam)
}
