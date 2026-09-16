import { describe, expect, it } from 'vitest';
import { CRASH_FREE_TARGET_RATE, computeCrashFreeRate } from './crash-free';

describe('computeCrashFreeRate', () => {
  it('returns null when no sessions started', () => {
    expect(
      computeCrashFreeRate({
        sessionClientIds: [],
        crashedClientIds: ['c1'],
      }),
    ).toEqual({
      sessionClients: 0,
      crashedClients: 1,
      rate: null,
      target: CRASH_FREE_TARGET_RATE,
      meetsTarget: null,
    });
  });

  it('counts unique clients and meets the G5 target', () => {
    const result = computeCrashFreeRate({
      sessionClientIds: ['a', 'b', 'c', 'a', undefined, ''],
      crashedClientIds: [],
    });
    expect(result.sessionClients).toBe(3);
    expect(result.crashedClients).toBe(0);
    expect(result.rate).toBe(1);
    expect(result.meetsTarget).toBe(true);
  });

  it('drops below target when too many unique clients crash', () => {
    const result = computeCrashFreeRate({
      sessionClientIds: ['a', 'b'],
      crashedClientIds: ['a'],
    });
    expect(result.rate).toBe(0.5);
    expect(result.meetsTarget).toBe(false);
  });
});
