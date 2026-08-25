import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const ORIGINAL_ENV = { ...process.env };

describe('dish routes', () => {
  beforeEach(() => {
    process.env.RATE_LIMIT_DISABLED = 'true';
    delete process.env.DATABASE_URL;
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
});
