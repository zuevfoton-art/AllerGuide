import { describe, expect, it } from 'vitest';
import {
  evaluateRepeatScanSmoke,
  resolveScanCacheStore,
} from './scan-smoke-expectation';

const HIT = 'Есть совпадения';

describe('resolveScanCacheStore', () => {
  it('treats only redis as shared', () => {
    expect(resolveScanCacheStore('redis')).toBe('redis');
    expect(resolveScanCacheStore('memory')).toBe('memory');
    expect(resolveScanCacheStore(undefined)).toBe('memory');
    expect(resolveScanCacheStore('other')).toBe('memory');
  });
});

describe('evaluateRepeatScanSmoke', () => {
  it('passes on a cache hit for either store', () => {
    for (const store of ['memory', 'redis', undefined] as const) {
      const result = evaluateRepeatScanSmoke({
        store,
        firstVerdict: HIT,
        secondOk: true,
        secondCached: true,
        secondVerdict: HIT,
      });
      expect(result.ok).toBe(true);
      expect(result.message).toMatch(/cache hit/);
    }
  });

  it('fails when the second scan request fails', () => {
    const result = evaluateRepeatScanSmoke({
      store: 'memory',
      firstVerdict: HIT,
      secondOk: false,
      secondCached: false,
      secondVerdict: undefined,
    });
    expect(result.ok).toBe(false);
    expect(result.message).toBe('Second scan failed');
  });

  it('requires a Redis cache hit', () => {
    const result = evaluateRepeatScanSmoke({
      store: 'redis',
      firstVerdict: HIT,
      secondOk: true,
      secondCached: false,
      secondVerdict: HIT,
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Redis cache/);
  });

  it('accepts a memory-store miss when the verdict matches', () => {
    const result = evaluateRepeatScanSmoke({
      store: 'memory',
      firstVerdict: HIT,
      secondOk: true,
      secondCached: false,
      secondVerdict: HIT,
    });
    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/per Serverless instance/);
  });

  it('fails a memory-store miss when the verdict changes', () => {
    const result = evaluateRepeatScanSmoke({
      store: 'memory',
      firstVerdict: HIT,
      secondOk: true,
      secondCached: false,
      secondVerdict: 'Безопасно',
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/verdict did not match/);
  });
});
