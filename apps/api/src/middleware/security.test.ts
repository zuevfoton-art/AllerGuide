import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { buildHealthPayload } from '../lib/health';
import { buildCorsOptions } from './security';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('security middleware', () => {
  it('sets helmet security headers', async () => {
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    const app = await createApp();
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('reflects origin when no allowlist is configured outside production', () => {
    delete process.env.CORS_ORIGINS;
    delete process.env.NODE_ENV;
    const options = buildCorsOptions();
    expect(options.origin).toBe(true);
  });

  it('denies browser origins in production when no allowlist is configured', () => {
    delete process.env.CORS_ORIGINS;
    const options = buildCorsOptions({ NODE_ENV: 'production' });
    const originFn = options.origin as (
      origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void,
    ) => void;

    return new Promise<void>((resolve, reject) => {
      originFn('https://evil.example.com', (err, allow) => {
        if (err) {
          reject(err);
          return;
        }
        expect(allow).toBe(false);
        resolve();
      });
    });
  });

  it('rejects origins outside the allowlist when configured', () => {
    process.env.CORS_ORIGINS = 'https://app.allerguide.io';
    const options = buildCorsOptions();
    const originFn = options.origin as (
      origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void,
    ) => void;

    const allowed = (origin: string | undefined) =>
      new Promise<boolean>((resolve, reject) => {
        originFn(origin, (err, allow) => (err ? reject(err) : resolve(Boolean(allow))));
      });

    return Promise.all([
      expect(allowed('https://app.allerguide.io')).resolves.toBe(true),
      expect(allowed(undefined)).resolves.toBe(true),
      expect(allowed('https://evil.example.com')).resolves.toBe(false),
    ]);
  });

  it('disables rate limiting when RATE_LIMIT_DISABLED is set', async () => {
    process.env.RATE_LIMIT_DISABLED = 'true';
    const app = await createApp();
    const response = await request(app).get('/api/health');
    expect(response.headers['ratelimit-limit']).toBeUndefined();
  });

  it('returns 429 after exceeding auth rate limit', async () => {
    process.env.AUTH_RATE_LIMIT_MAX = '2';
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';
    delete process.env.RATE_LIMIT_DISABLED;

    const app = await createApp();
    const payload = { loginType: 'email', login: 'x@y.z', password: 'short' };

    await request(app).post('/api/auth/login').send(payload);
    await request(app).post('/api/auth/login').send(payload);
    const blocked = await request(app).post('/api/auth/login').send(payload);

    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe('Too many authentication attempts');
  });
});

describe('health endpoint', () => {
  it('returns liveness when DATABASE_URL is unset', async () => {
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    const payload = await buildHealthPayload();
    expect(payload.ok).toBe(true);
    expect(payload.database).toBeUndefined();
  });

  it('returns 503 when DATABASE_URL is set but JWT_SECRET is missing', async () => {
    process.env.DATABASE_URL = 'postgresql://example';
    delete process.env.JWT_SECRET;
    const app = await createApp();
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(503);
    expect(response.body.authDatabase).toBe(false);
  });
});
