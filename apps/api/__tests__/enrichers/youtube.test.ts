import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import axios from 'axios';
import { enrichYouTube } from '../../src/enrichers/youtube';
import type { RawContentEvent, EnrichedEvent } from '../../src/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const baseRaw: RawContentEvent = {
  device_ip: '192.168.1.10',
  platform: 'youtube',
  content_type: 'video',
  content_id: 'dQw4w9WgXcQ',
  timestamp: 1700000000,
  environment: 'dev',
};

const basePartial: Partial<EnrichedEvent> = { ...baseRaw };

describe('enrichYouTube', () => {
  const originalKey = process.env.YOUTUBE_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.YOUTUBE_API_KEY = 'test-key-123';
  });

  afterAll(() => {
    process.env.YOUTUBE_API_KEY = originalKey;
  });

  it('enriches a standard video with all metadata fields', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        items: [{
          snippet: {
            title: 'Rick Astley - Never Gonna Give You Up',
            description: 'Official music video',
            categoryId: '10',
            channelTitle: 'Rick Astley',
            thumbnails: { medium: { url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg' } },
          },
          contentRating: {},
        }],
      },
    } as any);

    const result = await enrichYouTube(baseRaw, basePartial);

    expect(result.title).toBe('Rick Astley - Never Gonna Give You Up');
    expect(result.category).toBe('Music');
    expect(result.channel_name).toBe('Rick Astley');
    expect(result.thumbnail_url).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg');
    expect(result.age_restricted).toBe(false);
  });

  it('sets age_restricted = true when ytRating is ytAgeRestricted', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        items: [{
          snippet: { title: 'Age-gated video', categoryId: '24', channelTitle: 'Test' },
          contentRating: { ytRating: 'ytAgeRestricted' },
        }],
      },
    } as any);

    const result = await enrichYouTube(baseRaw, basePartial);
    expect(result.age_restricted).toBe(true);
    expect(result.mature_flag).toBe(true);
  });

  it('returns base event with fallback title when YOUTUBE_API_KEY is not set', async () => {
    delete process.env.YOUTUBE_API_KEY;

    const result = await enrichYouTube(baseRaw, basePartial);

    expect(result.title).toBe(`YouTube video ${baseRaw.content_id}`);
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('returns base event when video is not found (empty items array)', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { items: [] } } as any);

    const result = await enrichYouTube(baseRaw, basePartial);
    expect(result).toEqual(basePartial);
  });

  it('truncates description to 500 characters', async () => {
    const longDesc = 'x'.repeat(1000);
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        items: [{
          snippet: { title: 'Test', description: longDesc, categoryId: '24', channelTitle: 'Test' },
          contentRating: {},
        }],
      },
    } as any);

    const result = await enrichYouTube(baseRaw, basePartial);
    expect((result.description ?? '').length).toBeLessThanOrEqual(500);
  });

  it('falls back to Entertainment category for unknown categoryId', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        items: [{
          snippet: { title: 'Test', categoryId: '999', channelTitle: 'Test' },
          contentRating: {},
        }],
      },
    } as any);

    const result = await enrichYouTube(baseRaw, basePartial);
    expect(result.category).toBe('Entertainment');
  });
});
