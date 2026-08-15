import { describe, expect, it } from 'vitest';
import {
  parseScanHistoryMatchLabels,
  parseScanHistoryMatches,
  serializeScanHistoryMatches,
} from './scan-history-matches';

describe('scan-history-matches', () => {
  it('round-trips structured matches and composition', () => {
    const raw = serializeScanHistoryMatches({
      matches: ['Молоко'],
      crossMatches: ['Яблоко'],
      traceMatches: ['Орехи'],
      composition: 'молоко, сахар',
    });

    expect(parseScanHistoryMatches(raw)).toEqual({
      direct: ['Молоко'],
      cross: ['Яблоко'],
      trace: ['Орехи'],
      composition: 'молоко, сахар',
    });
  });

  it('treats a legacy flat array as direct matches', () => {
    expect(parseScanHistoryMatches(JSON.stringify(['Молоко', 'Глютен']))).toEqual({
      direct: ['Молоко', 'Глютен'],
      cross: [],
      trace: [],
    });
  });

  it('flattens labels for trend / diary consumers', () => {
    const raw = serializeScanHistoryMatches({
      matches: ['Молоко'],
      crossMatches: ['Яблоко'],
    });
    expect(parseScanHistoryMatchLabels(raw)).toEqual(['Молоко', 'Яблоко']);
  });
});
