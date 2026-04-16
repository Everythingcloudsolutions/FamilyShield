/**
 * Jest setup file — configure environment variables and globals for all tests
 */

// Test environment variables
process.env.NTFY_ENDPOINT = 'https://ntfy.example.com/test-alerts';
process.env.YOUTUBE_API_KEY = 'test-yt-api-key';
process.env.ROBLOX_API_KEY = 'test-roblox-api-key';
process.env.DISCORD_BOT_TOKEN = 'test-discord-token';
process.env.TWITCH_CLIENT_ID = 'test-twitch-client-id';
process.env.TWITCH_CLIENT_SECRET = 'test-twitch-client-secret';
process.env.GROQ_API_KEY = 'test-groq-api-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-api-key';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = 'test-supabase-anon-key';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.NODE_ENV = 'test';

// Suppress console warnings during tests
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});
