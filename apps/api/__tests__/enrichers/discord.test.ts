import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import axios from 'axios';
import { enrichDiscord } from '../../src/enrichers/discord';
import type { RawContentEvent, EnrichedEvent } from '../../src/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const makeRaw = (content_type: string, content_id: string): RawContentEvent => ({
  device_ip: '192.168.1.30',
  platform: 'discord',
  content_type,
  content_id,
  timestamp: 1700000000,
  environment: 'dev',
});

const toBase = (raw: RawContentEvent): Partial<EnrichedEvent> => ({ ...raw });

describe('enrichDiscord', () => {
  const originalToken = process.env.DISCORD_BOT_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DISCORD_BOT_TOKEN = 'Bot test-token-xyz';
  });

  afterAll(() => {
    process.env.DISCORD_BOT_TOKEN = originalToken;
  });

  it('returns base event when DISCORD_BOT_TOKEN is not set', async () => {
    delete process.env.DISCORD_BOT_TOKEN;
    const raw = makeRaw('guild', '1234567890');
    const result = await enrichDiscord(raw, toBase(raw));
    expect(result).toEqual(toBase(raw));
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  describe('guild enrichment', () => {
    it('enriches a normal guild', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { name: 'Gaming Lounge', nsfw_level: 0 },
      } as any);

      const raw = makeRaw('guild', '987654321');
      const result = await enrichDiscord(raw, toBase(raw));

      expect(result.title).toBe('Gaming Lounge');
      expect(result.category).toBe('Social — Discord Server');
      expect(result.mature_flag).toBe(false);
    });

    it('sets mature_flag = true for NSFW guilds (nsfw_level >= 2)', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { name: 'Adult Server', nsfw_level: 3 },
      } as any);

      const raw = makeRaw('guild', '111222333');
      const result = await enrichDiscord(raw, toBase(raw));

      expect(result.mature_flag).toBe(true);
    });

    it('sends Authorization header with Bot prefix', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { name: 'Test Guild', nsfw_level: 0 },
      } as any);

      const raw = makeRaw('guild', '333');
      await enrichDiscord(raw, toBase(raw));

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/guilds/333'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bot Bot test-token-xyz' }),
        }),
      );
    });
  });

  describe('channel enrichment', () => {
    it('enriches a normal text channel', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { name: 'general', nsfw: false },
      } as any);

      const raw = makeRaw('channel', '888777666');
      const result = await enrichDiscord(raw, toBase(raw));

      expect(result.title).toBe('#general');
      expect(result.category).toBe('Social — Discord Channel');
      expect(result.mature_flag).toBe(false);
    });

    it('sets mature_flag = true for NSFW channels', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { name: 'nsfw-channel', nsfw: true },
      } as any);

      const raw = makeRaw('channel', '555444333');
      const result = await enrichDiscord(raw, toBase(raw));

      expect(result.mature_flag).toBe(true);
    });
  });

  it('returns base event for unrecognised content_type', async () => {
    const raw = makeRaw('message', '999');
    const result = await enrichDiscord(raw, toBase(raw));
    expect(result).toEqual(toBase(raw));
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });
});
