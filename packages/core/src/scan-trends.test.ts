import { describe, expect, it } from 'vitest';
import { computeScanTrends, wasBarcodePreviouslyHighRisk } from './scan-trends';
import type { ScanHistoryEntry } from './types';

function entry(partial: Partial<ScanHistoryEntry> & Pick<ScanHistoryEntry, 'profileId'>): ScanHistoryEntry {
  return {
    id: 1,
    mode: 'product',
    input: '123',
    verdict: 'test',
    matches: '[]',
    level: 'low',
    productName: null,
    source: 'manual',
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe('scan-trends', () => {
  it('aggregates top allergens from recent history', () => {
    const history: ScanHistoryEntry[] = [
      entry({
        profileId: 1,
        matches: JSON.stringify(['Молоко', 'Глютен']),
        level: 'high',
      }),
      entry({
        profileId: 1,
        matches: JSON.stringify(['Молокo']),
        level: 'medium',
      }),
    ];

    const trends = computeScanTrends(history, 30);
    expect(trends.totalScans).toBe(2);
    expect(trends.highRiskCount).toBe(1);
    expect(trends.topAllergens.length).toBeGreaterThan(0);
  });

  it('detects repeat high-risk barcode', () => {
    const history: ScanHistoryEntry[] = [
      entry({ profileId: 1, input: '4601234567890', level: 'high', mode: 'product' }),
    ];

    expect(wasBarcodePreviouslyHighRisk(history, '4601234567890')).toBe(true);
    expect(wasBarcodePreviouslyHighRisk(history, '999')).toBe(false);
  });
});
