import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDishVisionCache } from '../lib/dish-vision-cache';
import { resetScanState } from '../lib/scan-cache';
import { registerScanDishVisionRoutes } from './scan-dish-vision';

vi.mock('../services/llm-dish-vision-provider', () => ({
  dishVisionConfigured: vi.fn(() => true),
  callDishVisionLlm: vi.fn(async () =>
    JSON.stringify({
      dishName: 'Оливье',
      ingredients: ['картофель', 'яйцо', 'майонез'],
      confidence: 'medium',
      notes: 'Оценка по фото',
    }),
  ),
}));

vi.mock('../lib/jwt', () => ({
  verifyAuthToken: vi.fn(async () => ({ sub: 'user-1' })),
}));

describe('POST /api/scan/dish-vision', () => {
  beforeEach(() => {
    resetDishVisionCache();
    resetScanState();
    process.env.AI_SCAN_ENABLED = 'true';
    process.env.AI_DISH_VISION_ENABLED = 'true';
    process.env.SCAN_REQUIRE_AUTH = 'false';
    process.env.RATE_LIMIT_DISABLED = 'true';
  });

  it('returns 503 when dish vision is not configured', async () => {
    const { dishVisionConfigured } = await import('../services/llm-dish-vision-provider');
    vi.mocked(dishVisionConfigured).mockReturnValueOnce(false);

    const app = express();
    app.use(express.json());
    registerScanDishVisionRoutes(app);

    const response = await request(app)
      .post('/api/scan/dish-vision')
      .send({ imageBase64: 'abc' });
    expect(response.status).toBe(503);
  });

  it('returns parsed dish vision result and caches the second call', async () => {
    const { callDishVisionLlm } = await import('../services/llm-dish-vision-provider');
    const app = express();
    app.use(express.json());
    registerScanDishVisionRoutes(app);

    const first = await request(app)
      .post('/api/scan/dish-vision')
      .send({ imageBase64: 'aGVsbG8=', mimeType: 'image/jpeg' });
    expect(first.status).toBe(200);
    expect(first.body.ok).toBe(true);
    expect(first.body.result.dishName).toBe('Оливье');
    expect(first.body.cached).toBe(false);

    const second = await request(app)
      .post('/api/scan/dish-vision')
      .send({ imageBase64: 'aGVsbG8=', mimeType: 'image/jpeg' });
    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);
    expect(vi.mocked(callDishVisionLlm)).toHaveBeenCalledTimes(1);
  });

  it('rejects missing image', async () => {
    const app = express();
    app.use(express.json());
    registerScanDishVisionRoutes(app);

    const response = await request(app).post('/api/scan/dish-vision').send({});
    expect(response.status).toBe(400);
  });
});
