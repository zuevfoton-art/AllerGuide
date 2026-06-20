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

  it('defines 10 condition types from TZ', () => {
    expect(ALLERGY_CONDITION_TYPES.length).toBe(10);
  });
});

describe('wellness', () => {
  it('computes lower score with high pollen and symptoms', () => {
    const good = computeWellnessScore({
      pollenMatches: [{ label: 'Берёза', value: 5, profileRelevant: true }],
      europeanAqi: 15,
      pm25: 10,
      recentSymptoms: false,
      recentTriggers: false,
      foodAllergens: [],
    });
    const bad = computeWellnessScore({
      pollenMatches: [{ label: 'Берёза', value: 80, profileRelevant: true }],
      europeanAqi: 70,
      pm25: 40,
      recentSymptoms: true,
      recentTriggers: true,
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
