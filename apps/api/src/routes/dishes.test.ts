import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { signAuthToken } from '../lib/jwt';
import { resetScanBudget } from '../lib/scan-cache';
import { callScanLlm } from '../services/llm-scan-provider';

vi.mock('../services/llm-scan-provider', () => ({
  callScanLlm: vi.fn(),
}));

const ORIGINAL_ENV = { ...process.env };

async function bearer(sub: number): Promise<string> {
  const token = await signAuthToken({ sub, login: `user${sub}`, loginType: 'email' });
  return `Bearer ${token}`;
}

describe('dish routes', () => {
  beforeEach(() => {
    process.env.RATE_LIMIT_DISABLED = 'true';
    process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters-long';
    process.env.AI_SCAN_ENABLED = 'true';
    process.env.DISH_LLM_ENABLED = 'true';
    process.env.SCAN_REQUIRE_AUTH = 'true';
    process.env.SCAN_DAILY_BUDGET = '100';
    delete process.env.DATABASE_URL;
    resetScanBudget();
    vi.mocked(callScanLlm).mockReset();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns bundled suggestions without a database', async () => {
    const app = await createApp();
    const response = await request(app).get('/api/dishes/search?q=спагетти%20балоньезе');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.dishes[0]?.id).toBe('spaghetti-bolognese');
  });

  it('rejects a short query', async () => {
    const app = await createApp();
    const response = await request(app).get('/api/dishes/search?q=а');
    expect(response.status).toBe(400);
  });

  it('rejects resolve without JWT when SCAN_REQUIRE_AUTH is true', async () => {
    const app = await createApp();
    const response = await request(app)
      .post('/api/dishes/resolve')
      .send({ query: 'борщ' });
    expect(response.status).toBe(401);
    expect(callScanLlm).not.toHaveBeenCalled();
  });

  it('returns a local recipe without calling the LLM or consuming budget', async () => {
    const app = await createApp();
    const response = await request(app)
      .post('/api/dishes/resolve')
      .set('Authorization', await bearer(7))
      .send({ query: 'борщ' });
    expect(response.status).toBe(200);
    expect(response.body.source).toBe('local');
    expect(response.body.dishId).toBe('borscht');
    expect(callScanLlm).not.toHaveBeenCalled();
  });

  it('calls the LLM for an unknown dish and counts it against the scan budget', async () => {
    process.env.SCAN_DAILY_BUDGET = '1';
    vi.mocked(callScanLlm).mockResolvedValue(
      JSON.stringify({
        canonicalName: 'mystery stew',
        kind: 'dish',
        ingredients: [],
        allergenHints: [],
      }),
    );
    const app = await createApp();
    const auth = await bearer(7);

    const first = await request(app)
      .post('/api/dishes/resolve')
      .set('Authorization', auth)
      .send({ query: 'неизвестное блюдо xyz' });
    expect(first.status).toBe(200);
    expect(first.body.source).toBe('llm');
    expect(callScanLlm).toHaveBeenCalledTimes(1);

    const second = await request(app)
      .post('/api/dishes/resolve')
      .set('Authorization', auth)
      .send({ query: 'другое неизвестное блюдо xyz' });
    expect(second.status).toBe(429);
    expect(callScanLlm).toHaveBeenCalledTimes(1);
  });
});
