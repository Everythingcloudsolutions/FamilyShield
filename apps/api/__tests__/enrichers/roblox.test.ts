import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import axios from 'axios';
import { enrichRoblox } from '../../src/enrichers/roblox';
import type { RawContentEvent, EnrichedEvent } from '../../src/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const baseRaw: RawContentEvent = {
  device_ip: '192.168.1.20',
  platform: 'roblox',
  content_type: 'game',
  content_id: '155615604',
  timestamp: 1700000000,
  environment: 'dev',
};

const basePartial: Partial<EnrichedEvent> = { ...baseRaw };

describe('enrichRoblox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enriches a game with all metadata and age recommendation', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          data: [{
            name: 'Adopt Me!',
            description: 'Adopt and raise cute pets',
            genre: 'Town and City',
            creator: { name: 'Uplift Games' },
            playing: 250000,
          }],
        },
      } as any)
      .mockResolvedValueOnce({
        data: { ageRecommendationDisplayName: 'All ages' },
      } as any);

    const result = await enrichRoblox(baseRaw, basePartial);

    expect(result.title).toBe('Adopt Me!');
    expect(result.category).toBe('Town and City');
    expect(result.channel_name).toBe('Uplift Games');
    expect(result.player_count).toBe(250000);
    expect(result.age_restricted).toBe(false);
    expect(result.mature_flag).toBe(false);
  });

  it('sets age_restricted = true for 17+ games', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          data: [{
            name: 'Mature Game',
            description: 'Mature content',
            genre: 'Action',
            creator: { name: 'Dev' },
            playing: 1000,
          }],
        },
      } as any)
      .mockResolvedValueOnce({
        data: { ageRecommendationDisplayName: '17+ Content Warning' },
      } as any);

    const result = await enrichRoblox(baseRaw, basePartial);
    expect(result.age_restricted).toBe(true);
    expect(result.mature_flag).toBe(true);
  });

  it('continues gracefully if age recommendation endpoint fails', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          data: [{
            name: 'Some Game',
            description: '',
            genre: 'Fighting',
            creator: { name: 'Dev' },
            playing: 500,
          }],
        },
      } as any)
      .mockRejectedValueOnce(new Error('Network error') as any);

    const result = await enrichRoblox(baseRaw, basePartial);
    expect(result.title).toBe('Some Game');
    expect(result.age_restricted).toBe(false); // Default to false on age-check failure
  });

  it('returns base event when game is not found', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { data: [] } } as any);

    const result = await enrichRoblox(baseRaw, basePartial);
    expect(result).toEqual(basePartial);
  });

  it('truncates description to 500 characters', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          data: [{
            name: 'Game',
            description: 'y'.repeat(1000),
            genre: 'Action',
            creator: { name: 'Dev' },
            playing: 100,
          }],
        },
      } as any)
      .mockResolvedValueOnce({ data: { ageRecommendationDisplayName: 'All ages' } } as any);

    const result = await enrichRoblox(baseRaw, basePartial);
    expect((result.description ?? '').length).toBeLessThanOrEqual(500);
  });
});
