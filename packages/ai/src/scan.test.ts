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

  it('detects lactose as milk allergen with high risk (D.3)', () => {
    const result = runMockScan({ mode: 'product', text: 'лактоза, вода', profile });
    expect(result.matches).toContain('Молоко');
    expect(result.level).toBe('high');
  });

  it('returns low risk when no matches', () => {
    const result = runMockScan({ mode: 'product', text: 'рис, вода', profile });
    expect(result.level).toBe('low');
    expect(result.matches).toHaveLength(0);
    expect(result.crossMatches).toEqual([]);
  });

  it('includes birch cross reaction matches in result', () => {
    const birchProfile = { allergies: JSON.stringify(['Пыльца берёзы']) };
    const result = runMockScan({ mode: 'product', text: 'яблоко, сахар', profile: birchProfile });
    expect(result.crossMatches.length).toBeGreaterThan(0);
    expect(result.level).toBe('medium');
  });

  it('elevates risk for high cross-reactions such as dust mites and seafood', () => {
    const dustProfile = { allergies: JSON.stringify(['Пыль клещей']) };
    const result = runMockScan({ mode: 'product', text: 'креветки, рис', profile: dustProfile });
    expect(result.crossMatches.length).toBeGreaterThan(0);
    expect(result.level).toBe('medium');
  });

  it('detects fish cross-reaction via other fish keywords', () => {
    const fishProfile = { allergies: JSON.stringify(['Рыба']) };
    const result = runMockScan({ mode: 'product', text: 'филе лосося, рис', profile: fishProfile });
    expect(result.crossMatches.some((item) => item.includes('Другие виды рыб'))).toBe(true);
    expect(result.level).toBe('medium');
  });

  it('detects trace allergens from may-contain text (D.4)', () => {
    const peanutProfile = { allergies: JSON.stringify(['Арахис']) };
    const result = runMockScan({
      mode: 'product',
      text: 'рис, соль. Может содержать арахис.',
      profile: peanutProfile,
    });
    expect(result.traceMatches?.length).toBeGreaterThan(0);
    expect(result.level).toBe('medium');
  });

  it('uses declared and trace tags from barcode lookup (D.2)', () => {
    const result = runMockScan({
      mode: 'product',
      text: 'water, sugar',
      profile,
      declaredAllergenIds: ['milk'],
      traceAllergenIds: ['peanut'],
    });
    expect(result.matches).toContain('Молоко');
    expect(result.traceMatches?.some((item) => item.includes('Арахис'))).toBe(true);
    expect(result.level).toBe('high');
  });
});
