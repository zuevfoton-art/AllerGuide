import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { consumeScanBudget, resetScanState } from './scan-cache';

const incr = vi.fn();
const expire = vi.fn();

vi.mock('./redis-client', () => ({
  isRedisConfigured: () => process.env.REDIS_URL != null,
  getRedisClient: async () => {
    if (!process.env.REDIS_URL) return null;
    return { incr, expire };
  },
}));

describe('consumeScanBudget', () => {
  beforeEach(() => {
    resetScanState();
    incr.mockReset();
    expire.mockReset();
    delete process.env.REDIS_URL;
    delete process.env.SCAN_DAILY_BUDGET;
  });

  afterEach(() => {
    delete process.env.REDIS_URL;
    delete process.env.SCAN_DAILY_BUDGET;
  });

  it('uses in-memory counts when Redis is off', async () => {
    process.env.SCAN_DAILY_BUDGET = '1';
    expect(await consumeScanBudget('user-a')).toBe(true);
    expect(await consumeScanBudget('user-a')).toBe(false);
    expect(incr).not.toHaveBeenCalled();
  });

  it('increments a Redis key and expires it on first count', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.SCAN_DAILY_BUDGET = '2';
    incr.mockResolvedValueOnce(1).mockResolvedValueOnce(2).mockResolvedValueOnce(3);

    expect(await consumeScanBudget('user-b')).toBe(true);
    expect(expire).toHaveBeenCalledTimes(1);
    expect(await consumeScanBudget('user-b')).toBe(true);
    expect(await consumeScanBudget('user-b')).toBe(false);
  });
});
