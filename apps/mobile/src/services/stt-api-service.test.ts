import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('stt-api-service', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.EXPO_PUBLIC_YC_STT = 'true';
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.EXPO_PUBLIC_YC_STT;
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  it('returns null when flag is off', async () => {
    process.env.EXPO_PUBLIC_YC_STT = 'false';
    vi.resetModules();
    vi.doMock('@/src/services/auth-service', () => ({
      getBackendAuthToken: vi.fn().mockResolvedValue(null),
    }));
    const { recognizeSpeechViaApi } = await import('./stt-api-service');
    expect(await recognizeSpeechViaApi({ audioBase64: 'YWJj' })).toBeNull();
  });

  it('parses successful STT response', async () => {
    vi.doMock('@/src/services/auth-service', () => ({
      getBackendAuthToken: vi.fn().mockResolvedValue('tok'),
    }));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, text: 'молоко' }),
      }),
    );
    const { recognizeSpeechViaApi } = await import('./stt-api-service');
    const result = await recognizeSpeechViaApi({ audioBase64: 'YWJj', format: 'lpcm' });
    expect(result).toEqual({ ok: true, text: 'молоко' });
  });
});
