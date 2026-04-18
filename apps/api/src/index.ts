/**
 * FamilyShield API Worker
 * =======================
 * Consumes content events from Redis queue (populated by mitmproxy addon),
 * enriches them via platform APIs, scores risk via Groq/Anthropic,
 * and stores results in Supabase.
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import pino from "pino";
import { startEventWorker } from "./worker/event-consumer";
import { createRedisClient } from "./lib/redis";
import { createSupabaseClient } from "./lib/supabase";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });
const PORT = process.env.PORT ?? 3001;

async function main() {
  log.info({ environment: process.env.NODE_ENV }, "FamilyShield API starting...");

  // Verify dependencies
  const redis = await createRedisClient();
  const supabase = createSupabaseClient();

  log.info("Redis connected ✓");
  log.info("Supabase client ready ✓");

  // Start Express health/status server
  const app = express();
  app.use(express.json());

  const metricsLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // limit each IP to 60 requests per window
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.1.0",
    });
  });

  app.get("/metrics", metricsLimiter, async (_req, res) => {
    const queueLength = await redis.lLen("familyshield:content_events");
    res.json({ queue_depth: queueLength });
  });

  app.listen(PORT, () => {
    log.info({ port: PORT }, "Health server listening");
  });

  // Start the main event processing loop
  await startEventWorker({ redis, supabase, log });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
