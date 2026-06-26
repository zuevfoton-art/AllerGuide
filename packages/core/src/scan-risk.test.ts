import { describe, expect, it } from 'vitest';
import {
  computeScanRiskLevel,
  type ScanMatch,
} from './scan-risk';

describe('computeScanRiskLevel', () => {
  it('elevates true food allergy direct match to high (D.3)', () => {
    const matches: ScanMatch[] = [
      {
        kind: 'direct',
        allergenId: 'milk',
        label: 'Молоко',
        confidence: 'high',
      },
    ];
    expect(computeScanRiskLevel(matches, ['milk'])).toBe('high');
  });

  it('caps OAS cross-reaction at medium', () => {
    const matches: ScanMatch[] = [
      {
        kind: 'cross',
        allergenId: 'apple',
        label: 'Яблоко',
        syndrome: 'oas',
        risk: 'high',
        confidence: 'medium',
      },
    ];
    expect(computeScanRiskLevel(matches, ['birch-pollen'])).toBe('medium');
  });

  it('treats profile-relevant trace allergens as medium', () => {
    const matches: ScanMatch[] = [
      {
        kind: 'trace',
        allergenId: 'peanut',
        label: 'Арахис',
        confidence: 'medium',
      },
    ];
    expect(computeScanRiskLevel(matches, ['peanut'])).toBe('medium');
  });

  it('returns low when only unknown terms are present', () => {
    const matches: ScanMatch[] = [
      {
        kind: 'unknown',
        allergenId: 'exotic-spice',
        label: 'exotic-spice',
        confidence: 'low',
      },
    ];
    expect(computeScanRiskLevel(matches, ['milk'])).toBe('low');
  });
});
