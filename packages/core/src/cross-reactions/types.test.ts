import { describe, expect, it } from 'vitest';
import { compareCrossReactionRisk } from './types';

describe('cross-reaction risk ordering', () => {
  it('orders high before medium and low', () => {
    expect(compareCrossReactionRisk('high', 'medium')).toBeLessThan(0);
    expect(compareCrossReactionRisk('medium', 'low')).toBeLessThan(0);
    expect(compareCrossReactionRisk('high', 'low')).toBeLessThan(0);
  });
});
