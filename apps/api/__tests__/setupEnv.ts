/**
 * Jest setupFiles — runs BEFORE ts-jest transforms and module loading
 * Sets environment variables that modules will read at import time
 */

process.env.NTFY_URL = 'https://ntfy.example.com';
process.env.NTFY_TOPIC = 'test-alerts';
process.env.YOUTUBE_API_KEY = 'test-yt-api-key';
process.env.ROBLOX_API_KEY = 'test-roblox-api-key';
process.env.DISCORD_BOT_TOKEN = 'test-discord-token';
process.env.TWITCH_CLIENT_ID = 'test-twitch-client-id';
process.env.TWITCH_CLIENT_SECRET = 'test-twitch-client-secret';
process.env.GROQ_API_KEY = 'test-groq-api-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-api-key';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = 'test-supabase-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-supabase-service-role-key';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.NODE_ENV = 'test';
