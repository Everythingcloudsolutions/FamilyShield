import { createClient, RedisClientType } from 'redis';
import { Logger } from 'pino';

let redisClient: RedisClientType | null = null;

/**
 * Create or get a singleton Redis client.
 * Phase 1: Connection-only. Event publishing and subscription logic
 * will be added in Phase 2 when the event processor is fully implemented.
 */
export async function createRedisClient(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = createClient({
    url: REDIS_URL,
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));

  await redisClient.connect();
  return redisClient;
}

/**
 * Close the Redis connection (cleanup).
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export { RedisClientType };
