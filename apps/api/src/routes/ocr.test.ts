import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const ORIGINAL_ENV = { ...process.env };

describe('ocr routes', () => {
  beforeEach(() => {
    process.env.YC_OCR_ENABLED = 'true';
    process.env.YC_AI_API_KEY = 'yc-key';
    process.env.YC_FOLDER_ID = 'b1gtest';
    process.env.RATE_LIMIT_DISABLED = 'true';
    delete process.env.OCR_REQUIRE_AUTH;
    delete process.env.SCAN_REQUIRE_AUTH;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it('returns 503 when OCR disabled', async () => {
    process.env.YC_OCR_ENABLED = 'false';
    const app = await createApp({ withReplitAuth: false });
    const response = await request(app).post('/api/ocr').send({ imageBase64: 'abc' });
    expect(response.status).toBe(503);
  });

  it('requires auth when SCAN_REQUIRE_AUTH is set', async () => {
    process.env.SCAN_REQUIRE_AUTH = 'true';
    const app = await createApp({ withReplitAuth: false });
    const response = await request(app).post('/api/ocr').send({ imageBase64: 'abc' });
    expect(response.status).toBe(401);
  });

  it('recognizes text via Vision OCR', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            result: { textAnnotation: { fullText: 'Состав: молоко' } },
          }),
          { status: 200 },
        ),
      ),
    );

    const app = await createApp({ withReplitAuth: false });
    const response = await request(app)
      .post('/api/ocr')
      .send({ imageBase64: 'abc', mimeType: 'image/jpeg' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      text: 'Состав: молоко',
      fullText: 'Состав: молоко',
    });
  });
});
