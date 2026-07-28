import { describe, expect, it } from 'vitest';
import {
  getGatedConditionRemovals,
  hasGatedConditionRemovals,
  isGatedConditionRemoval,
} from './profile-condition-gating';

describe('profile condition gating', () => {
  it('marks clinical diary conditions as gated removals', () => {
    expect(isGatedConditionRemoval('asthma')).toBe(true);
    expect(isGatedConditionRemoval('food')).toBe(false);
  });

  it('returns removed gated conditions only', () => {
    const previous = ['food', 'asthma', 'pollinosis'] as const;
    const next = ['food'] as const;
    expect(getGatedConditionRemovals([...previous], [...next])).toEqual(['asthma', 'pollinosis']);
    expect(hasGatedConditionRemovals([...previous], [...next])).toBe(true);
  });

  it('ignores non-gated removals', () => {
    const previous = ['food', 'drug'] as const;
    const next = ['food'] as const;
    expect(getGatedConditionRemovals([...previous], [...next])).toEqual([]);
    expect(hasGatedConditionRemovals([...previous], [...next])).toBe(false);
  });
});
