import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  recognizeSpeechWithYandexSpeechkit,
  stripWavHeaderIfPresent,
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

  it('strips WAV header for lpcm payloads', () => {
    const pcm = Buffer.alloc(32, 1);
    const wav = Buffer.alloc(44 + pcm.length);
    wav.write('RIFF', 0);
    wav.writeUInt32LE(36 + pcm.length, 4);
    wav.write('WAVE', 8);
    wav.write('fmt ', 12);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(16000, 24);
    wav.writeUInt32LE(32000, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write('data', 36);
    wav.writeUInt32LE(pcm.length, 40);
    pcm.copy(wav, 44);
    expect(stripWavHeaderIfPresent(wav).equals(pcm)).toBe(true);
    expect(stripWavHeaderIfPresent(pcm).equals(pcm)).toBe(true);
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
