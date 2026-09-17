import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '@/src/services/api-client';
import { getBackendAuthToken } from '@/src/services/auth-service';
import { trackEvent } from '@/src/services/analytics-service';
import {
  buildAskOfflineCards,
  loadAskHistory,
  saveAskHistory,
  sendAskQuestion,
} from './ask-chat-service';

const settings = new Map<string, string>();

vi.mock('@/src/services/settings-service', () => ({
  getSetting: (key: string) => settings.get(key) ?? null,
  setSetting: (key: string, value: string) => {
    settings.set(key, value);
  },
}));

vi.mock('@/src/services/analytics-service', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('@/src/constants/features', () => ({
  AI_CHAT_ENABLED: true,
}));

vi.mock('@/src/services/api-client', () => ({
  apiRequest: vi.fn(),
}));

vi.mock('@/src/services/auth-service', () => ({
  getBackendAuthToken: vi.fn(),
}));

describe('ask-chat-service', () => {
  afterEach(() => {
    settings.clear();
    vi.mocked(apiRequest).mockReset();
    vi.mocked(getBackendAuthToken).mockReset();
    vi.mocked(trackEvent).mockReset();
  });

  it('round-trips local history without keeping extra turns', () => {
    saveAskHistory(
      Array.from({ length: 3 }, (_, index) => ({
        id: String(index),
        role: index % 2 === 0 ? 'user' : 'assistant',
        text: `m${index}`,
        at: new Date(2026, 8, 9, 12, index).toISOString(),
      })),
    );

    expect(loadAskHistory()).toHaveLength(3);
  });

  it('hands distress wording to SOS and never calls the API', async () => {
    const result = await sendAskQuestion({
      raw: 'Я задыхаюсь',
      locale: 'ru',
      history: [],
      fallbackAnswer: 'offline',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.handoff).toBe(true);
    expect(result.reply.handoff).toBe(true);
    expect(apiRequest).not.toHaveBeenCalled();
    expect(getBackendAuthToken).not.toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith('ai_chat_handoff_sos', { length_bucket: 'short' });
  });

  it('passes the backend JWT when calling /api/ask', async () => {
    vi.mocked(getBackendAuthToken).mockResolvedValueOnce('jwt-ask');
    vi.mocked(apiRequest).mockResolvedValueOnce({
      ok: true,
      data: { ok: true, answer: 'Пыльца высокая, сократите прогулку.' },
    });

    const result = await sendAskQuestion({
      raw: 'Можно гулять?',
      locale: 'ru',
      history: [],
      fallbackAnswer: 'offline',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.offline).toBe(false);
    expect(result.reply.text).toContain('Пыльца высокая');
    expect(getBackendAuthToken).toHaveBeenCalledOnce();
    expect(apiRequest).toHaveBeenCalledWith(
      '/api/ask',
      expect.objectContaining({
        method: 'POST',
        token: 'jwt-ask',
      }),
    );
  });

  it('falls back to offline copy when there is no token and the API returns 401', async () => {
    vi.mocked(getBackendAuthToken).mockResolvedValueOnce(null);
    vi.mocked(apiRequest).mockResolvedValueOnce({ ok: false, error: 'Unauthorized', status: 401 });

    const result = await sendAskQuestion({
      raw: 'Можно гулять?',
      locale: 'ru',
      history: [],
      fallbackAnswer: 'Нет сети',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.offline).toBe(true);
    expect(result.reply.text).toBe('Нет сети');
    expect(apiRequest).toHaveBeenCalledWith(
      '/api/ask',
      expect.objectContaining({ token: null }),
    );
  });

  it('falls back to offline copy when the API is down (503)', async () => {
    vi.mocked(getBackendAuthToken).mockResolvedValueOnce('jwt-ask');
    vi.mocked(apiRequest).mockResolvedValueOnce({ ok: false, error: 'unavailable', status: 503 });

    const result = await sendAskQuestion({
      raw: 'Можно гулять?',
      locale: 'ru',
      history: [],
      fallbackAnswer: 'Нет сети',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.offline).toBe(true);
    expect(result.reply.text).toBe('Нет сети');
  });

  it('returns bundled expert cards for the offline sheet', () => {
    const cards = buildAskOfflineCards();
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.some((card) => card.articleId === 'pollinosis-basics')).toBe(true);
    expect(cards.some((card) => card.articleId === 'food-allergy-tips')).toBe(true);
  });
});
