import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import axios from 'axios';
import { enrichTwitch } from '../../src/enrichers/twitch';
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
    mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
    mockedAxios.get.mockResolvedValueOnce({ data: { data: [] } } as any);

    const result = await enrichTwitch(baseRaw, basePartial);

    expect(result.title).toContain('offline');
    expect(result.category).toBe('Gaming');
  });

  it('sets mature_flag = true for is_mature streams', async () => {
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

  it('reuses cached token without calling /token endpoint again', async () => {
    // First call: acquires token
    mockedAxios.post.mockResolvedValueOnce(mockTokenResponse);
    mockedAxios.get.mockResolvedValue({ data: { data: [] } } as any);
    await enrichTwitch(baseRaw, basePartial);

    // Second call: should reuse token (no second post)
    await enrichTwitch(baseRaw, basePartial);

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });
});
