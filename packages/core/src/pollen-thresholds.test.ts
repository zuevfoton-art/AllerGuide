import { describe, expect, it } from 'vitest';
import { classifyPollenConcentration, getPollenThresholds, pollenPercentileRank } from './pollen-thresholds';

describe('pollen-thresholds (B.3)', () => {
  it('uses taxon-specific EAACI-inspired cutoffs for birch', () => {
    expect(getPollenThresholds('birch_pollen')).toEqual({ lowMax: 15, midMax: 80 });
    expect(classifyPollenConcentration(10, 'birch_pollen')).toBe('low');
    expect(classifyPollenConcentration(40, 'birch_pollen')).toBe('mid');
    expect(classifyPollenConcentration(90, 'birch_pollen')).toBe('high');
  });

  it('uses lower grass thresholds', () => {
    expect(classifyPollenConcentration(4, 'grass_pollen')).toBe('low');
    expect(classifyPollenConcentration(15, 'grass_pollen')).toBe('mid');
    expect(classifyPollenConcentration(25, 'grass_pollen')).toBe('high');
  });

  it('computes percentile rank', () => {
    const ref = [1, 5, 10, 20, 50];
    expect(pollenPercentileRank(1, ref)).toBe(0);
    expect(pollenPercentileRank(50, ref)).toBe(80);
  });
});
