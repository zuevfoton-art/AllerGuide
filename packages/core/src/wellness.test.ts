import { describe, expect, it } from 'vitest';
import { computeDiaryInsights } from './diary-stats';
import {
  buildClinicalScalesFromTrends,
  buildDiarySeriesFromInsights,
  computeWellnessConfidence,
  computeWellnessScore,
  computeWellnessScoreBreakdown,
  pollenTier,
  WELLNESS_WEIGHTS_VERSION,
  wellnessStatusFromScore,
} from './wellness';
import { WELLNESS_WEIGHTS } from './wellness-weights';
import type { DiaryEntry } from './types';

function makeEntry(type: string, iso: string, details = '{}'): DiaryEntry {
  return { id: 1, profileId: 1, type, details, createdAt: `${iso}T12:00:00.000Z` };
}

describe('wellness v2 (B.4–B.9)', () => {
  const baseInput = {
    profileAllergenIds: ['birch-pollen'],
    pollenMatches: [{ label: 'Берёза', value: 5, profileRelevant: true, taxonId: 'birch_pollen' as const, allergenId: 'birch-pollen' }],
    europeanAqi: 15,
    pm25: 10,
    diary: { symptomDays: 0, triggerDays: 0, streak: 0, weekTotal: 0, correlationKind: null },
    clinicalScales: [],
    foodAllergens: [],
    envDataAvailable: true,
  };

  it('uses taxon-specific pollen tiers (B.3)', () => {
    expect(pollenTier(10, 'birch_pollen').level).toBe('low');
    expect(pollenTier(40, 'birch_pollen').level).toBe('mid');
    expect(pollenTier(90, 'birch_pollen').level).toBe('high');
  });

  it('computes lower score with high pollen and 7-day symptoms (B.5)', () => {
    const good = computeWellnessScore(baseInput);
    const bad = computeWellnessScore({
      ...baseInput,
      pollenMatches: [{ label: 'Берёза', value: 90, profileRelevant: true, taxonId: 'birch_pollen', allergenId: 'birch-pollen' }],
      diary: { symptomDays: 4, triggerDays: 2, streak: 4, weekTotal: 8, correlationKind: 'symptom-trigger' },
    });
    expect(good).toBeGreaterThan(bad);
  });

  it('adds clinical scale penalties (B.4)', () => {
    const without = computeWellnessScore(baseInput);
    const withScale = computeWellnessScore({
      ...baseInput,
      clinicalScales: [{ scaleId: 'act', level: 'uncontrolled', total: 12, label: 'Астма' }],
    });
    expect(without).toBeGreaterThan(withScale);
    expect(without - withScale).toBe(WELLNESS_WEIGHTS.clinicalScale.uncontrolled);
  });

  it('includes cross-reaction penalty for elevated birch pollen (B.6)', () => {
    const breakdown = computeWellnessScoreBreakdown({
      ...baseInput,
      pollenMatches: [{ label: 'Берёза', value: 90, profileRelevant: true, taxonId: 'birch_pollen', allergenId: 'birch-pollen' }],
    });
    expect(breakdown.crossReactionPenalty).toBeGreaterThan(0);
    expect(breakdown.weightsVersion).toBe(WELLNESS_WEIGHTS_VERSION);
  });

  it('derives confidence from env and diary richness (B.7)', () => {
    expect(computeWellnessConfidence({ envDataAvailable: true, diaryWeekTotal: 4, clinicalScalesCount: 0 })).toBe('high');
    expect(computeWellnessConfidence({ envDataAvailable: true, diaryWeekTotal: 0, clinicalScalesCount: 0 })).toBe('medium');
    expect(computeWellnessConfidence({ envDataAvailable: false, diaryWeekTotal: 0, clinicalScalesCount: 0 })).toBe('low');
  });

  it('builds diary series from 7-day insights (B.5)', () => {
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    const entries = [makeEntry('Симптомы', iso)];
    const insights = computeDiaryInsights(entries);
    const series = buildDiarySeriesFromInsights(insights);
    expect(series.symptomDays).toBe(1);
    expect(insights.days).toHaveLength(7);
  });

  it('builds clinical scales from diary trends (B.4)', () => {
    const scales = buildClinicalScalesFromTrends([
      { scaleId: 'act', label: 'Астма', total: 14, interpretation: 'Недостаточный контроль', at: '2026-01-01' },
    ]);
    expect(scales[0]?.level).toBe('uncontrolled');
  });

  it('maps score to status labels', () => {
    expect(wellnessStatusFromScore(85).level).toBe('good');
    expect(wellnessStatusFromScore(55).level).toBe('attention');
  });
});
