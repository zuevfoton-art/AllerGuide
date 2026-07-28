import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  recognizeTextWithYandexVision,
  yandexVisionOcrConfigured,
} from './yandex-vision-ocr';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe('yandexVisionOcrConfigured', () => {
  it('requires flag and credentials', () => {
    process.env.YC_OCR_ENABLED = 'true';
    process.env.YC_AI_API_KEY = 'k';
    process.env.YC_FOLDER_ID = 'f';
    expect(yandexVisionOcrConfigured()).toBe(true);

    process.env.YC_OCR_ENABLED = 'false';
    expect(yandexVisionOcrConfigured()).toBe(false);
  });
});

describe('recognizeTextWithYandexVision', () => {
  it('returns null when disabled', async () => {
    process.env.YC_OCR_ENABLED = 'false';
    expect(await recognizeTextWithYandexVision({ imageBase64: 'abc' })).toBeNull();
  });

  it('posts to Vision OCR and returns fullText', async () => {
    process.env.YC_OCR_ENABLED = 'true';
    process.env.YC_AI_API_KEY = 'yc-key';
    process.env.YC_FOLDER_ID = 'b1gfolder';

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.mimeType).toBe('JPEG');
      expect(body.content).toBe('abc123');
      expect(body.languageCodes).toEqual(['ru', 'en']);
      return new Response(
        JSON.stringify({
          result: { textAnnotation: { fullText: 'Состав: молоко, сахар' } },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await recognizeTextWithYandexVision({
      imageBase64: 'data:image/jpeg;base64,abc123',
      mimeType: 'image/jpeg',
    });

    expect(result).toEqual({
      text: 'Состав: молоко, сахар',
      fullText: 'Состав: молоко, сахар',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://ocr.api.cloud.yandex.net/ocr/v1/recognizeText',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns null on non-OK', async () => {
    process.env.YC_OCR_ENABLED = 'true';
    process.env.YC_AI_API_KEY = 'yc-key';
    process.env.YC_FOLDER_ID = 'b1gfolder';
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 403 })));
    expect(await recognizeTextWithYandexVision({ imageBase64: 'x' })).toBeNull();
  });
});
