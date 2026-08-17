import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { getScanMetrics, resetScanState } from '../lib/scan-cache';

const ORIGINAL_ENV = { ...process.env };

const LLM_CONTENT =
  '{"verdict":"ok","reason":"none","matches":[],"crossMatches":[],"level":"low"}';

function mockLlm() {
  return vi.fn(async () =>
    new Response(
      JSON.stringify({ choices: [{ message: { content: LLM_CONTENT } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  );
}

describe('scan caching, budget and auth', () => {
  beforeEach(() => {
    process.env.AI_SCAN_ENABLED = 'true';
    process.env.AI_PROVIDER = 'openai';
    process.env.RATE_LIMIT_DISABLED = 'true';
    process.env.OPENAI_API_KEY = 'test-key';
    delete process.env.SCAN_REQUIRE_AUTH;
    delete process.env.SCAN_DAILY_BUDGET;
    resetScanState();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it('serves identical scans from cache (single LLM call)', async () => {
    const fetchMock = mockLlm();
    vi.stubGlobal('fetch', fetchMock);

    const app = await createApp();
    const payload = { mode: 'product', text: 'молоко, сахар', allergens: ['Молоко'] };

    const first = await request(app).post('/api/scan').send(payload);
    expect(first.status).toBe(200);
    expect(first.body.cached).toBe(false);

    const second = await request(app).post('/api/scan').send(payload);
    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('enforces the daily budget on cache misses', async () => {
    process.env.SCAN_DAILY_BUDGET = '1';
    const fetchMock = mockLlm();
    vi.stubGlobal('fetch', fetchMock);

    const app = await createApp();

    const first = await request(app)
      .post('/api/scan')
      .send({ mode: 'product', text: 'unique one', allergens: [] });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/scan')
      .send({ mode: 'product', text: 'unique two', allergens: [] });
    expect(second.status).toBe(429);
  });

  it('requires auth when SCAN_REQUIRE_AUTH is set', async () => {
    process.env.SCAN_REQUIRE_AUTH = 'true';
    vi.stubGlobal('fetch', mockLlm());

    const app = await createApp();
    const response = await request(app)
      .post('/api/scan')
      .send({ mode: 'product', text: 'молоко', allergens: [] });

    expect(response.status).toBe(401);
  });

  it('tracks cache metrics and enforces SCAN_DAILY_BUDGET=50', async () => {
    process.env.SCAN_DAILY_BUDGET = '50';
    const fetchMock = mockLlm();
    vi.stubGlobal('fetch', fetchMock);

    const app = await createApp();
    resetScanState();

    for (let i = 0; i < 50; i += 1) {
      const response = await request(app)
        .post('/api/scan')
        .send({ mode: 'product', text: `budget-${i}`, allergens: [] });
      expect(response.status).toBe(200);
    }

    const rejected = await request(app)
      .post('/api/scan')
      .send({ mode: 'product', text: 'budget-51', allergens: [] });
    expect(rejected.status).toBe(429);

    const metrics = getScanMetrics();
    expect(metrics.cacheMisses).toBe(51);
    expect(metrics.budgetRejections).toBe(1);
    expect(metrics.hitRate).toBe(0);
  });

  it('uses YandexGPT when AI_PROVIDER=yandex', async () => {
    process.env.AI_PROVIDER = 'yandex';
    process.env.YC_AI_API_KEY = 'yc-test';
    process.env.YC_FOLDER_ID = 'b1gtest';
    delete process.env.OPENAI_API_KEY;

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          result: {
            alternatives: [{ message: { text: LLM_CONTENT } }],
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const app = await createApp();
    const response = await request(app)
      .post('/api/scan')
      .send({ mode: 'product', text: 'молоко yandex', allergens: ['Молоко'] });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
      expect.anything(),
    );
  });
});
