import { describe, expect, it } from 'vitest';
import { findInciIrritants } from './inci-allergens';

describe('findInciIrritants', () => {
  it('finds EU-26 fragrance allergens and common preservatives in an INCI line', () => {
    const hits = findInciIrritants(
      'Aqua, Sodium Laureth Sulfate, Parfum, Limonene, Linalool, Methylisothiazolinone, Lanolin',
    );
    const ids = hits.map((item) => item.id);
    expect(ids).toContain('limonene');
    expect(ids).toContain('linalool');
    expect(ids).toContain('methylisothiazolinone');
    expect(ids).toContain('lanolin');
  });

  it('returns nothing for a food ingredients list', () => {
    expect(findInciIrritants('молоко, сахар, культуры')).toEqual([]);
  });
});
