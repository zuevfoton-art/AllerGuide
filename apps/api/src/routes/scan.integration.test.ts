import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { resetScanState } from '../lib/scan-cache';
import {
  applyIntegrationDefaults,
  hasIntegrationDatabase,
  resetProfileData,
  uniqueLogin,
} from '../test/integration-harness';
import { closeDb } from '../db';

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

describe.skipIf(!hasIntegrationDatabase)('scan integration (P1.6c)', () => {
  beforeAll(() => {
    applyIntegrationDefaults();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    resetScanState();
    await resetProfileData();
  });

  afterAll(() => {
    closeDb();
  });

  it('authenticates via JWT, caches identical scans, and enforces daily budget', async () => {
    process.env.SCAN_DAILY_BUDGET = '2';
    vi.stubGlobal('fetch', mockLlm());

    const app = await createApp();
    const login = uniqueLogin('scan');
    const password = 'TestPass1!';

    const register = await request(app).post('/api/auth/register').send({
      loginType: 'email',
      login,
      password,
      confirmPassword: password,
    });
    expect(register.status).toBe(201);
    const token = register.body.token as string;

    const payload = { mode: 'product', text: `ci-scan-${Date.now()}`, allergens: ['Молоко'] };

    const first = await request(app)
      .post('/api/scan')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(first.status).toBe(200);
    expect(first.body.cached).toBe(false);

    const cached = await request(app)
      .post('/api/scan')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(cached.status).toBe(200);
    expect(cached.body.cached).toBe(true);

    const unique = await request(app)
      .post('/api/scan')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...payload, text: `${payload.text}-other` });
    expect(unique.status).toBe(200);

    const overBudget = await request(app)
      .post('/api/scan')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...payload, text: `${payload.text}-third` });
    expect(overBudget.status).toBe(429);
  });
});
