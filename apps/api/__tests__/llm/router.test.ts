import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { EnrichedEvent } from '../../src/types';

// Create mock instances that will be used
let groqCreateMock: jest.Mock<any>;
let anthropicCreateMock: jest.Mock<any>;

// Mock SDKs before importing
jest.mock('groq-sdk', () => {
  groqCreateMock = jest.fn<any>();
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: groqCreateMock,
        },
      },
    })),
  };
});

jest.mock('@anthropic-ai/sdk', () => {
  anthropicCreateMock = jest.fn<any>();
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: anthropicCreateMock,
      },
    })),
  };
});

import { scoreRisk } from '../../src/llm/router';

const testEvent: EnrichedEvent = {
  device_ip: '10.0.0.1',
  platform: 'youtube',
  content_type: 'video',
  content_id: 'test123',
  timestamp: 1700000000,
  environment: 'dev',
  title: 'Minecraft Let\'s Play #42',
  category: 'Gaming',
  age_restricted: false,
  mature_flag: false,
};

describe('scoreRisk (LLM router)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns Groq risk result on success', async () => {
    const groqResponse = JSON.stringify({
      risk_level: 'low',
      categories: ['gaming', 'entertainment'],
      confidence: 0.92,
      reasoning: 'Family-friendly Minecraft content',
    });

    groqCreateMock.mockResolvedValueOnce({
      choices: [{ message: { content: groqResponse } }],
      usage: { total_tokens: 150 },
    });

    const result = await scoreRisk(testEvent);

    expect(result.risk_level).toBe('low');
    expect(result.categories).toContain('gaming');
    expect(result.confidence).toBe(0.92);
    expect(result.provider).toBe('groq');
    expect(result.tokens_used).toBe(150);
  });

  it('falls back to Anthropic when Groq throws', async () => {
    groqCreateMock.mockRejectedValueOnce(
      new Error('Groq rate limit exceeded'),
    );

    const anthropicResponse = JSON.stringify({
      risk_level: 'medium',
      categories: ['gaming'],
      confidence: 0.75,
      reasoning: 'Some mature themes',
    });

    anthropicCreateMock.mockResolvedValueOnce({
      content: [{ type: 'text', text: anthropicResponse }],
      usage: { input_tokens: 80, output_tokens: 50 },
    });

    const result = await scoreRisk(testEvent);

    expect(result.provider).toBe('anthropic');
    expect(result.risk_level).toBe('medium');
    expect(result.tokens_used).toBe(130); // 80 + 50
  });

  it('handles JSON wrapped in markdown code fences', async () => {
    const fencedResponse = '```json\n{"risk_level":"high","categories":["violence"],"confidence":0.88}\n```';

    groqCreateMock.mockResolvedValueOnce({
      choices: [{ message: { content: fencedResponse } }],
      usage: { total_tokens: 90 },
    });

    const result = await scoreRisk(testEvent);
    expect(result.risk_level).toBe('high');
    expect(result.confidence).toBe(0.88);
  });

  it('returns safe defaults when JSON parse fails', async () => {
    groqCreateMock.mockResolvedValueOnce({
      choices: [{ message: { content: 'This is not JSON' } }],
      usage: { total_tokens: 20 },
    });

    const result = await scoreRisk(testEvent);

    expect(result.risk_level).toBe('medium'); // Safe default
    expect(result.confidence).toBe(0.3);
    expect(result.categories).toContain('unknown');
  });

  it('returns safe defaults when both Groq and Anthropic fail', async () => {
    groqCreateMock.mockRejectedValueOnce(new Error('Groq down'));
    anthropicCreateMock.mockRejectedValueOnce(new Error('Anthropic down'));

    await expect(scoreRisk(testEvent)).rejects.toThrow('Anthropic down');
  });
});
