import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerScanIntentRoutes } from './scan-intent';

vi.mock('../services/llm-scan-provider', () => ({
  callScanLlm: vi.fn(async () => '{"intent":"label_or_menu","mode":"menu"}'),
}));

describe('POST /api/scan/intent', () => {
  beforeEach(() => {
    process.env.AI_SCAN_ENABLED = 'true';
    process.env.YC_SCAN_INTENT_LLM = 'true';
    process.env.SCAN_REQUIRE_AUTH = 'false';
  });

  afterEach(() => {
    delete process.env.AI_SCAN_ENABLED;
    delete process.env.YC_SCAN_INTENT_LLM;
    delete process.env.SCAN_REQUIRE_AUTH;
  });

  it('returns 503 when intent LLM flag is off', async () => {
    process.env.YC_SCAN_INTENT_LLM = 'false';
    const app = express();
    app.use(express.json());
    registerScanIntentRoutes(app);

    const response = await request(app)
      .post('/api/scan/intent')
      .send({ text: 'меню: паста' });
    expect(response.status).toBe(503);
  });

  it('rejects an invalid intent payload', async () => {
    const app = express();
    app.use(express.json());
    registerScanIntentRoutes(app);

    const response = await request(app)
      .post('/api/scan/intent')
      .send({ text: '', fallbackMode: 'recipe' });
    expect(response.status).toBe(400);
    expect(response.body.ok).toBe(false);
  });

  it('classifies OCR text when enabled', async () => {
    const app = express();
    app.use(express.json());
    registerScanIntentRoutes(app);

    const response = await request(app)
      .post('/api/scan/intent')
      .send({ text: 'Меню: паста карбонара' });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.intent).toBe('label_or_menu');
    expect(response.body.mode).toBe('menu');
  });
});
