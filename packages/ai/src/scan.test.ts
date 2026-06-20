import { describe, expect, it } from 'vitest';
import { runMockScan } from './scan';

const profile = {
  allergies: JSON.stringify(['Молоко', 'Арахис']),
};

describe('runMockScan', () => {
  it('detects multiple allergen matches', () => {
    const result = runMockScan({ mode: 'product', text: 'молоко, арахис, сахар', profile });
    expect(result.level).toBe('high');
    expect(result.matches).toContain('Молоко');
    expect(result.matches).toContain('Арахис');
  });

  it('detects lactose as milk allergen', () => {
    const result = runMockScan({ mode: 'product', text: 'лактоза, вода', profile });
    expect(result.matches).toContain('Молоко');
  });

  it('returns low risk when no matches', () => {
    const result = runMockScan({ mode: 'product', text: 'рис, вода', profile });
    expect(result.level).toBe('low');
    expect(result.matches).toHaveLength(0);
    expect(result.crossMatches).toEqual([]);
  });

  it('includes cross reaction matches in result', () => {
    const birchProfile = { allergies: JSON.stringify(['Пыльца берёзы']) };
    const result = runMockScan({ mode: 'product', text: 'яблоко, сахар', profile: birchProfile });
    expect(result.crossMatches.length).toBeGreaterThan(0);
  });
});
