import { describe, expect, it } from 'vitest';
import {
  profileEnablesAsit,
  profileEnablesPeakFlow,
  ALLERGY_CONDITION_TYPES,
} from './allergy-conditions';
import { computeWellnessScore, wellnessStatusFromScore } from './wellness';
import { getDefaultReportBlockIds, DOCTOR_REPORT_BLOCKS } from './doctor-report';

describe('allergy-conditions', () => {
  it('enables peak flow for asthma', () => {
    expect(profileEnablesPeakFlow(['asthma'])).toBe(true);
    expect(profileEnablesPeakFlow(['food'])).toBe(false);
  });

  it('enables ASIT for pollinosis and rhinitis', () => {
    expect(profileEnablesAsit(['pollinosis'])).toBe(true);
    expect(profileEnablesAsit(['rhinitis'])).toBe(true);
    expect(profileEnablesAsit(['food'])).toBe(false);
  });

  it('defines 11 condition types including urticaria', () => {
    expect(ALLERGY_CONDITION_TYPES.length).toBe(11);
    expect(ALLERGY_CONDITION_TYPES.some((item) => item.id === 'urticaria')).toBe(true);
  });
});

describe('wellness', () => {
  const baseInput = {
    profileAllergenIds: [] as string[],
    pollenMatches: [{ label: 'Берёза', value: 5, profileRelevant: true, taxonId: 'birch_pollen' as const }],
    europeanAqi: 15,
    pm25: 10,
    diary: { symptomDays: 0, triggerDays: 0, streak: 0, weekTotal: 0, correlationKind: null, temporalCorrelationKind: null, anomalyKind: null, anomalyDays: 0 },
    clinicalScales: [],
    foodAllergens: [],
    envDataAvailable: true,
  };

  it('computes lower score with high pollen and symptoms', () => {
    const good = computeWellnessScore(baseInput);
    const bad = computeWellnessScore({
      ...baseInput,
      pollenMatches: [{ label: 'Берёза', value: 80, profileRelevant: true, taxonId: 'birch_pollen' }],
      europeanAqi: 70,
      pm25: 40,
      diary: {
        ...baseInput.diary,
        symptomDays: 3,
        triggerDays: 2,
        streak: 3,
        weekTotal: 5,
        correlationKind: 'symptom-trigger',
      },
      foodAllergens: ['Молоко'],
    });
    expect(good).toBeGreaterThan(bad);
  });

  it('maps score to status labels', () => {
    expect(wellnessStatusFromScore(85).level).toBe('good');
    expect(wellnessStatusFromScore(55).level).toBe('attention');
  });
});

describe('doctor-report', () => {
  it('includes peakflow and asit blocks', () => {
    const ids = getDefaultReportBlockIds();
    expect(ids).toContain('peakflow');
    expect(ids).toContain('asit');
    expect(DOCTOR_REPORT_BLOCKS.some((b) => b.diaryTypes.includes('Пикфлоуметрия'))).toBe(true);
  });
});
