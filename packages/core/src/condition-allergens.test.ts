import { describe, expect, it } from 'vitest';
import { getSuggestedAllergenIdsForConditions } from './condition-allergens';

describe('getSuggestedAllergenIdsForConditions', () => {
  it('returns food allergens for food condition', () => {
    const ids = getSuggestedAllergenIdsForConditions(['food']);
    expect(ids).toContain('milk');
    expect(ids).toContain('peanut');
  });

  it('returns pollen allergens for pollinosis', () => {
    const ids = getSuggestedAllergenIdsForConditions(['pollinosis']);
    expect(ids).toContain('birch-pollen');
    expect(ids).toContain('ragweed-pollen');
  });

  it('returns household allergens', () => {
    const ids = getSuggestedAllergenIdsForConditions(['household']);
    expect(ids).toContain('dust-mites');
    expect(ids).toContain('mold');
  });

  it('returns empty for asthma-only profile', () => {
    expect(getSuggestedAllergenIdsForConditions(['asthma'])).toEqual([]);
  });

  it('deduplicates across conditions', () => {
    const ids = getSuggestedAllergenIdsForConditions(['pollinosis', 'household']);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
