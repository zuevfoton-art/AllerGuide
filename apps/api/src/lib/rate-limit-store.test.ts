import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPoolerUrl } from '../db/config';
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

describe('pooler URL detection', () => {
  it('detects -pooler hosts and YC Odyssey port 6432', () => {
    expect(isPoolerUrl('postgresql://user:pass@db-pooler.internal.example/db')).toBe(true);
    expect(isPoolerUrl('postgresql://user:pass@c-xxx.rw.mdb.yandexcloud.net:6432/db')).toBe(true);
    expect(isPoolerUrl('postgresql://user:pass@db.internal.example:5432/db')).toBe(false);
  });
});
