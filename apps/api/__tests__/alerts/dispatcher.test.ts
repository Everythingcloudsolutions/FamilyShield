import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import axios from 'axios';
import { dispatchAlert } from '../../src/alerts/dispatcher';
import type { EnrichedEvent } from '../../src/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

function makeDeps() {
  const redis = {
    get: jest.fn<any>().mockResolvedValue(null),
    setEx: jest.fn<any>().mockResolvedValue('OK'),
  } as any;

  const supabase = {
    from: jest.fn().mockReturnValue({
      insert: jest.fn<any>().mockResolvedValue({ error: null }),
    }),
  } as any;

  const log = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as any;

  return { redis, supabase, log };
}

const criticalEvent: EnrichedEvent = {
  device_ip: '10.0.0.5',
  platform: 'youtube',
  content_type: 'video',
  content_id: 'abc123',
  timestamp: 1700000000,
  environment: 'dev',
  title: 'Dangerous Content Video',
  category: 'Entertainment',
  risk_level: 'critical',
  risk_categories: ['adult', 'violence'],
  risk_confidence: 0.95,
  ai_provider: 'groq',
};

describe('dispatchAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NTFY_URL = 'https://ntfy.example.com';
    process.env.NTFY_TOPIC = 'test-alerts';
  });

  it('sends ntfy notification and inserts Supabase row', async () => {
    const deps = makeDeps();
    mockedAxios.post.mockResolvedValueOnce({ status: 200 } as any);

    await dispatchAlert(criticalEvent, deps);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://ntfy.example.com/test-alerts',
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Priority: 'urgent',
          Tags: ['shield', 'youtube'],
        }),
      }),
    );

    expect(deps.supabase.from).toHaveBeenCalledWith('alerts');
  });

  it('sets Redis dedup key after successful dispatch', async () => {
    const deps = makeDeps();
    mockedAxios.post.mockResolvedValueOnce({ status: 200 } as any);

    await dispatchAlert(criticalEvent, deps);

    expect(deps.redis.setEx).toHaveBeenCalledWith(
      `alert:dedup:${criticalEvent.device_ip}:${criticalEvent.content_id}`,
      300,
      '1',
    );
  });

  it('suppresses duplicate alerts when dedup key exists', async () => {
    const deps = makeDeps();
    deps.redis.get = jest.fn<any>().mockResolvedValue('1'); // Already sent

    await dispatchAlert(criticalEvent, deps);

    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(deps.supabase.from).not.toHaveBeenCalled();
    expect(deps.log.debug).toHaveBeenCalledWith(
      expect.any(Object),
      'Alert suppressed (dedup)',
    );
  });

  it('continues to Supabase insert even if ntfy fails', async () => {
    const deps = makeDeps();
    mockedAxios.post.mockRejectedValueOnce(new Error('ntfy unreachable') as any);

    await dispatchAlert(criticalEvent, deps);

    expect(deps.log.error).toHaveBeenCalledWith(
      expect.any(Object),
      'ntfy dispatch failed — continuing to Supabase',
    );
    expect(deps.supabase.from).toHaveBeenCalledWith('alerts');
  });

  it('logs Supabase error without throwing', async () => {
    const deps = makeDeps();
    mockedAxios.post.mockResolvedValueOnce({ status: 200 } as any);
    deps.supabase.from.mockReturnValue({
      insert: jest.fn<any>().mockResolvedValue({ error: new Error('DB constraint') }),
    });

    await expect(dispatchAlert(criticalEvent, deps)).resolves.not.toThrow();
    expect(deps.log.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Error) }),
      'Supabase alert insert failed',
    );
  });

  it('uses ntfy priority "high" for risk_level high (not urgent)', async () => {
    const deps = makeDeps();
    mockedAxios.post.mockResolvedValueOnce({ status: 200 } as any);

    const highEvent: EnrichedEvent = { ...criticalEvent, risk_level: 'high' };
    await dispatchAlert(highEvent, deps);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Priority: 'high' }),
      }),
    );
  });
});
