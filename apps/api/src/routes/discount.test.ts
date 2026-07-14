import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const ORIGINAL_ENV = { ...process.env };

describe('discount routes', () => {
  beforeEach(() => {
    process.env.RATE_LIMIT_DISABLED = 'true';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('validates WELCOME10 percent discount', async () => {
    const app = await createApp({ withReplitAuth: false });
    const response = await request(app)
      .post('/api/discounts/validate')
      .send({ code: 'welcome10', subtotalMinor: 150_000, currency: 'RUB' });

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.code).toBe('WELCOME10');
    expect(response.body.discountMinor).toBe(15_000);
    expect(response.body.totalMinor).toBe(135_000);
  });

  it('returns 404 for unknown promo codes', async () => {
    const app = await createApp({ withReplitAuth: false });
    const response = await request(app)
      .post('/api/discounts/validate')
      .send({ code: 'UNKNOWN', subtotalMinor: 200_000 });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ ok: false, error: 'not_found' });
  });

  it('returns 400 for invalid subtotal', async () => {
    const app = await createApp({ withReplitAuth: false });
    const response = await request(app)
      .post('/api/discounts/validate')
      .send({ code: 'WELCOME10', subtotalMinor: -1 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ ok: false, error: 'invalid_subtotal' });
  });

  it('returns 404 when subtotal is below minimum', async () => {
    const app = await createApp({ withReplitAuth: false });
    const response = await request(app)
      .post('/api/discounts/validate')
      .send({ code: 'SAVE500', subtotalMinor: 100_000 });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ ok: false, error: 'below_minimum' });
  });
});
