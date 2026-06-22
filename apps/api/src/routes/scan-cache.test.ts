import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { clearScanCache, resetScanBudget } from '../lib/scan-cache';

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
    process.env.RATE_LIMIT_DISABLED = 'true';
    process.env.OPENAI_API_KEY = 'test-key';
    delete process.env.SCAN_REQUIRE_AUTH;
    delete process.env.SCAN_DAILY_BUDGET;
    clearScanCache();
    resetScanBudget();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it('serves identical scans from cache (single LLM call)', async () => {
    const fetchMock = mockLlm();
    vi.stubGlobal('fetch', fetchMock);

    const app = await createApp({ withReplitAuth: false });
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

    const app = await createApp({ withReplitAuth: false });

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

    const app = await createApp({ withReplitAuth: false });
    const response = await request(app)
      .post('/api/scan')
      .send({ mode: 'product', text: 'молоко', allergens: [] });

    expect(response.status).toBe(401);
  });
});
