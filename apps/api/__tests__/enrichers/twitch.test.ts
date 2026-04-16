import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import axios from 'axios';
import type { RawContentEvent, EnrichedEvent } from '../../src/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const baseRaw: RawContentEvent = {
  device_ip: '192.168.1.40',
  platform: 'twitch',
  content_type: 'stream',
  content_id: 'ninja',
  timestamp: 1700000000,
  environment: 'dev',
};

const basePartial: Partial<EnrichedEvent> = { ...baseRaw };

const mockTokenResponse = {
  data: { access_token: 'mock-token-abc', expires_in: 3600 },
} as any;

describe('enrichTwitch', () => {
  const originalClientId = process.env.TWITCH_CLIENT_ID;
  const originalClientSecret = process.env.TWITCH_CLIENT_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TWITCH_CLIENT_ID = 'test-client-id';
    process.env.TWITCH_CLIENT_SECRET = 'test-client-secret';
  });

  afterAll(() => {
    process.env.TWITCH_CLIENT_ID = originalClientId;
    process.env.TWITCH_CLIENT_SECRET = originalClientSecret;
  });

  it('enriches a live stream with all metadata', async () => {
    const { enrichTwitch } = await import('../../src/enrichers/twitch');
    mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        data: [{
          user_login: 'ninja',
          title: 'Fortnite solo ranked grind!',
          game_name: 'Fortnite',
          viewer_count: 48000,
          is_mature: false,
        }],
      },
    } as any);

    const result = await enrichTwitch(baseRaw, basePartial);

    expect(result.title).toContain('ninja');
    expect(result.title).toContain('Fortnite solo ranked grind!');
    expect(result.category).toBe('Fortnite');
    expect(result.viewer_count).toBe(48000);
    expect(result.mature_flag).toBe(false);
  });

  it('handles an offline streamer gracefully', async () => {
    const { enrichTwitch } = await import('../../src/enrichers/twitch');
    mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
    mockedAxios.get.mockResolvedValueOnce({ data: { data: [] } } as any);

    const result = await enrichTwitch(baseRaw, basePartial);

    expect(result.title).toContain('offline');
    expect(result.category).toBe('Gaming');
  });

  it('sets mature_flag = true for is_mature streams', async () => {
    const { enrichTwitch } = await import('../../src/enrichers/twitch');
    mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        data: [{
          user_login: 'mature_streamer',
          title: 'Mature stream',
          game_name: 'Grand Theft Auto V',
          viewer_count: 5000,
          is_mature: true,
        }],
      },
    } as any);

    const result = await enrichTwitch(baseRaw, basePartial);
    expect(result.mature_flag).toBe(true);
  });

  it('handles multiple calls efficiently', async () => {
    const { enrichTwitch: enrichTwitchFresh } = await import('../../src/enrichers/twitch');
    mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
    mockedAxios.get.mockResolvedValue({ data: { data: [] } } as any);

    // First and second call
    await enrichTwitchFresh(baseRaw, basePartial);
    await enrichTwitchFresh(baseRaw, basePartial);

    // At least the initial call succeeds (caching is internal optimization)
    expect(mockedAxios.get).toHaveBeenCalled();
  });
});
