import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const ORIGINAL_ENV = { ...process.env };

describe('catalog routes', () => {
  beforeEach(() => {
    process.env.RATE_LIMIT_DISABLED = 'true';
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('serves the static allergen catalog when no database is configured', async () => {
    const app = await createApp();
    const response = await request(app).get('/api/allergens');

    expect(response.status).toBe(200);
    expect(response.body.source).toBe('static');
    expect(Array.isArray(response.body.allergens)).toBe(true);
    expect(response.body.allergens.length).toBeGreaterThan(0);
    expect(response.body.allergens.some((a: { name: string }) => a.name === 'Молоко')).toBe(true);
  });

  it('returns 503 for product lookup without a database', async () => {
    const app = await createApp();
    const response = await request(app).get('/api/products/12345');
    expect(response.status).toBe(503);
  });

  it('returns 503 for product search without a database when OFF fallback is off', async () => {
    process.env.PRODUCT_OFF_FALLBACK = 'false';
    const app = await createApp();
    const response = await request(app).get('/api/products/search?q=milk');
    expect(response.status).toBe(503);
  });

  it('validates short search queries (route precedence over :barcode)', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    const app = await createApp();
    const response = await request(app).get('/api/products/search?q=a');
    // "search" must hit the search handler (400), not the :barcode lookup.
    expect(response.status).toBe(400);
  });
});
