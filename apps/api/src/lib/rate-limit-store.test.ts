import { afterEach, describe, expect, it, vi } from 'vitest';
import { isNeonPoolerUrl } from '../db/config';
import { __resetRedisClientForTests } from './redis-client';
import { resolveRateLimitStoreKind } from './rate-limit-store';

vi.mock('./redis-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./redis-client')>();
  return {
    ...actual,
    getRedisClient: vi.fn(async () => ({
      isOpen: true,
      sendCommand: vi.fn(async () => 'OK'),
      ping: vi.fn(async () => 'PONG'),
    })),
    pingRedis: vi.fn(async () => ({ ok: true, latencyMs: 3 })),
  };
});

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  __resetRedisClientForTests();
  vi.clearAllMocks();
});

describe('rate-limit-store', () => {
  it('reports memory store when REDIS_URL is unset', () => {
    delete process.env.REDIS_URL;
    expect(resolveRateLimitStoreKind()).toBe('memory');
  });

  it('reports redis store when REDIS_URL is configured', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    expect(resolveRateLimitStoreKind()).toBe('redis');
  });
});

describe('neon pooler detection', () => {
  it('detects pooled Neon URLs', () => {
    expect(isNeonPoolerUrl('postgresql://user:pass@ep-foo-pooler.us-east-2.aws.neon.tech/db')).toBe(true);
    expect(isNeonPoolerUrl('postgresql://user:pass@ep-foo.us-east-2.aws.neon.tech/db')).toBe(false);
  });
});
