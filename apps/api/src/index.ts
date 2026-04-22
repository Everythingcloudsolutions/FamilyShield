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
import fs from "fs";
import path from "path";
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

  const certLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // certificate download endpoint should be low-frequency
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

  // Serve the mitmproxy CA certificate so the portal /cert page can offer a download.
  // The cert lives at /opt/familyshield-data/mitmproxy/mitmproxy-ca-cert.pem on the server.
  // Locally (dev), it falls back to MITMPROXY_CERT_PATH env var or a relative path.
  const CERT_PATH =
    process.env.MITMPROXY_CERT_PATH ??
    "/opt/familyshield-data/mitmproxy/mitmproxy-ca-cert.pem";

  app.get("/cert", certLimiter, (_req, res) => {
    if (!fs.existsSync(CERT_PATH)) {
      res.status(404).json({
        error: "Certificate not found",
        hint: "Run the FamilyShield stack and let mitmproxy generate its CA on first start. The cert will appear at " + CERT_PATH,
      });
      return;
    }
    const cert = fs.readFileSync(CERT_PATH);
    res.setHeader("Content-Type", "application/x-pem-file");
    res.setHeader("Content-Disposition", 'attachment; filename="familyshield-ca.pem"');
    res.setHeader("Cache-Control", "no-store");
    res.send(cert);
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
