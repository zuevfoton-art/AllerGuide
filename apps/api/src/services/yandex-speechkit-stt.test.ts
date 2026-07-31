import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  recognizeSpeechWithYandexSpeechkit,
  yandexSpeechkitSttConfigured,
} from './yandex-speechkit-stt';

describe('yandex-speechkit-stt', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.YC_STT_ENABLED;
    delete process.env.YC_AI_API_KEY;
    delete process.env.YC_FOLDER_ID;
  });

  it('is disabled without flag/credentials', () => {
    expect(yandexSpeechkitSttConfigured()).toBe(false);
  });

  it('posts audio and returns transcript', async () => {
    process.env.YC_STT_ENABLED = 'true';
    process.env.YC_AI_API_KEY = 'yc-key';
    process.env.YC_FOLDER_ID = 'b1gfolder';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: ' молоко сахар ' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const text = await recognizeSpeechWithYandexSpeechkit({
      audioBase64: Buffer.from('fake-audio-bytes-long-enough').toString('base64'),
      format: 'lpcm',
      sampleRateHertz: 16000,
      lang: 'ru-RU',
    });

    expect(text).toBe('молоко сахар');
    expect(fetchMock).toHaveBeenCalledOnce();
    const url = String(fetchMock.mock.calls[0]?.[0] ?? '');
    expect(url).toContain('stt.api.cloud.yandex.net');
    expect(url).toContain('folderId=b1gfolder');
    expect(url).toContain('format=lpcm');
  });

  it('returns empty string when SpeechKit hears no speech', async () => {
    process.env.YC_STT_ENABLED = 'true';
    process.env.YC_AI_API_KEY = 'yc-key';
    process.env.YC_FOLDER_ID = 'b1gfolder';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: '' }),
      }),
    );

    const text = await recognizeSpeechWithYandexSpeechkit({
      audioBase64: Buffer.from('fake-audio-bytes-long-enough').toString('base64'),
      format: 'lpcm',
    });
    expect(text).toBe('');
  });
});
