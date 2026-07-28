import { describe, expect, it } from 'vitest';
import {
  createEmptySymptomBaseline,
  isSymptomBaselineEmpty,
  normalizeSymptomBaseline,
  parseSymptomBaselineJson,
  serializeSymptomBaseline,
  suggestSymptomsForProfile,
  toggleTypicalSymptomId,
} from './profile-symptom-baseline';

describe('profile-symptom-baseline', () => {
  it('treats empty baseline as null after normalize', () => {
    expect(normalizeSymptomBaseline(createEmptySymptomBaseline())).toBeNull();
    expect(isSymptomBaselineEmpty(createEmptySymptomBaseline())).toBe(true);
  });

  it('keeps zones, severity and capped symptom ids', () => {
    const normalized = normalizeSymptomBaseline({
      zoneIds: ['nose', 'nose', 'bogus' as 'nose'],
      usualSeverity: 'mild',
      typicalSymptomIds: [
        'sneezing',
        'cough',
        'wheeze',
        'pruritus',
        'urticaria',
        'nausea',
        'vomiting',
        'diarrhea',
        'gi-symptoms',
        'anaphylaxis',
      ],
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(normalized?.zoneIds).toEqual(['nose']);
    expect(normalized?.usualSeverity).toBe('mild');
    expect(normalized?.typicalSymptomIds).toHaveLength(8);
    expect(normalized?.typicalSymptomIds).not.toContain('anaphylaxis');
  });

  it('round-trips JSON', () => {
    const raw = serializeSymptomBaseline({
      zoneIds: ['eyes'],
      usualSeverity: 'moderate',
      typicalSymptomIds: ['ocular-itching'],
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(raw).toBeTruthy();
    expect(parseSymptomBaselineJson(raw)).toEqual({
      zoneIds: ['eyes'],
      usualSeverity: 'moderate',
      typicalSymptomIds: ['ocular-itching'],
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('suggests symptoms by zone over conditions', () => {
    const byZone = suggestSymptomsForProfile(['food'], ['nose']);
    expect(byZone.every((item) => ['nasal-congestion', 'rhinorrhea', 'sneezing'].includes(item.id))).toBe(
      true,
    );

    const byCondition = suggestSymptomsForProfile(['asthma'], []);
    expect(byCondition.map((item) => item.id)).toEqual(
      expect.arrayContaining(['cough', 'wheeze', 'chest-tightness']),
    );
  });

  it('toggles typical symptom ids with max cap', () => {
    expect(toggleTypicalSymptomId(['sneezing'], 'sneezing')).toEqual([]);
    expect(toggleTypicalSymptomId(['sneezing'], 'cough')).toEqual(['sneezing', 'cough']);
    const eight = [
      'sneezing',
      'cough',
      'wheeze',
      'pruritus',
      'urticaria',
      'nausea',
      'vomiting',
      'diarrhea',
    ];
    expect(toggleTypicalSymptomId(eight, 'gi-symptoms')).toEqual(eight);
  });
});
