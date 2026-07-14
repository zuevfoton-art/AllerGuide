import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { applyIntegrationDefaults } from '../test/integration-harness';

const ORIGINAL_ENV = { ...process.env };

describe('discount API integration', () => {
  beforeAll(() => {
    applyIntegrationDefaults();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.RATE_LIMIT_DISABLED = 'true';
  });

  it('validates SAVE500 fixed discount end-to-end', async () => {
    const app = await createApp({ withReplitAuth: false });
    const response = await request(app)
      .post('/api/discounts/validate')
      .send({ code: 'SAVE500', subtotalMinor: 250_000, currency: 'RUB' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      code: 'SAVE500',
      type: 'fixed',
      amount: 50_000,
      discountMinor: 50_000,
      totalMinor: 200_000,
      subtotalMinor: 250_000,
      currency: 'RUB',
    });
  });

  it('rejects expired codes with 404', async () => {
    const app = await createApp({ withReplitAuth: false });
    const response = await request(app)
      .post('/api/discounts/validate')
      .send({ code: 'EXPIRED', subtotalMinor: 300_000 });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('expired');
  });
});
