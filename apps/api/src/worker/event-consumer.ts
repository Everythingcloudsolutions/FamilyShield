/**
 * Event Consumer Worker
 * Reads from Redis queue → enriches → scores → stores → alerts
 */

import type { Logger } from "pino";
import type { RedisClientType } from "redis";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enrichEvent } from "../enrichers";
import { scoreRisk } from "../llm/router";
import { dispatchAlert } from "../alerts/dispatcher";
import type { RawContentEvent, EnrichedEvent } from "../types";

const QUEUE_KEY = "familyshield:content_events";
const BATCH_TIMEOUT_MS = 2000; // Block for up to 2s waiting for events

interface WorkerDeps {
  redis: RedisClientType;
  supabase: SupabaseClient;
  log: Logger;
}

export async function startEventWorker(deps: WorkerDeps): Promise<void> {
  const { redis, supabase, log } = deps;

  log.info("Event consumer worker started — listening on queue: %s", QUEUE_KEY);

  // Main processing loop — runs forever
  while (true) {
    try {
      // Block-pop: waits up to BATCH_TIMEOUT_MS for an event
      const result = await redis.brPop(QUEUE_KEY, BATCH_TIMEOUT_MS / 1000);

      if (!result) continue; // Timeout — loop again

      const raw: RawContentEvent = JSON.parse(result.element);

      log.debug(
        { platform: raw.platform, content_id: raw.content_id, device: raw.device_ip },
        "Processing event"
      );

      // 1. Enrich with platform API metadata
      const enriched = await enrichEvent(raw);
      if (!enriched) {
        log.debug("Enrichment returned null — skipping event");
        continue;
      }

      // 2. AI risk scoring (cached 24h in Redis)
      const cacheKey = `risk:${raw.platform}:${raw.content_id}`;
      const cachedScore = await redis.get(cacheKey);

      let riskResult;
      if (cachedScore) {
        riskResult = JSON.parse(cachedScore);
        log.debug({ content_id: raw.content_id }, "Risk score from cache");
      } else {
        riskResult = await scoreRisk(enriched);
        await redis.setEx(cacheKey, 86400, JSON.stringify(riskResult)); // 24h TTL
      }

      const finalEvent: EnrichedEvent = {
        ...enriched,
        risk_level: riskResult.risk_level,
        risk_categories: riskResult.categories,
        risk_confidence: riskResult.confidence,
        ai_provider: riskResult.provider,
      };

      // 3. Store in Supabase
      const { error } = await supabase
        .from("content_events")
        .insert({
          device_ip:       finalEvent.device_ip,
          platform:        finalEvent.platform,
          content_type:    finalEvent.content_type,
          content_id:      finalEvent.content_id,
          title:           finalEvent.title,
          category:        finalEvent.category,
          risk_level:      finalEvent.risk_level,
          risk_categories: finalEvent.risk_categories,
          risk_confidence: finalEvent.risk_confidence,
          ai_provider:     finalEvent.ai_provider,
          environment:     finalEvent.environment,
          captured_at:     new Date(finalEvent.timestamp * 1000).toISOString(),
        });

      if (error) {
        log.error({ error }, "Supabase insert failed");
      }

      // 4. Dispatch alert if risk threshold exceeded
      if (finalEvent.risk_level === "high" || finalEvent.risk_level === "critical") {
        await dispatchAlert(finalEvent, deps);
      }

      log.info(
        {
          platform:   finalEvent.platform,
          title:      finalEvent.title?.slice(0, 50),
          risk:       finalEvent.risk_level,
          device:     finalEvent.device_ip,
        },
        "Event processed"
      );
    } catch (err) {
      log.error({ err }, "Event processing error — continuing");
      await sleep(1000); // Brief pause on error to avoid tight error loops
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
