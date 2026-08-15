import type { WellnessScoreBreakdown } from './wellness';

export type WellnessVerbalTier = 'none' | 'low' | 'moderate' | 'high' | 'unknown';

export type WellnessPrimaryFactorId = 'pollen' | 'air' | 'diary' | 'clinical' | 'asit' | 'none';

export interface WellnessPrimaryFactor {
  id: WellnessPrimaryFactorId;
  penalty: number;
}

const INDEX_MODERATE_MIN = 40;
const INDEX_GOOD_MIN = 80;
const POLLEN_NEARLY_NONE = 1;
const PM25_COMFORTABLE = 15;
const PM25_BELOW_COMFORT = 35;

export function verbalizeWellnessIndex(score: number): WellnessVerbalTier {
  if (score >= INDEX_GOOD_MIN) return 'low';
  if (score >= INDEX_MODERATE_MIN) return 'moderate';
  return 'high';
}

export function verbalizePollenValue(grainsPerM3: number | null | undefined): WellnessVerbalTier {
  if (grainsPerM3 == null || Number.isNaN(grainsPerM3)) return 'unknown';
  if (grainsPerM3 < POLLEN_NEARLY_NONE) return 'none';
  if (grainsPerM3 < 10) return 'low';
  if (grainsPerM3 < 50) return 'moderate';
  return 'high';
}

export function verbalizePm25(ugPerM3: number | null | undefined): WellnessVerbalTier {
  if (ugPerM3 == null || Number.isNaN(ugPerM3)) return 'unknown';
  if (ugPerM3 <= PM25_COMFORTABLE) return 'low';
  if (ugPerM3 <= PM25_BELOW_COMFORT) return 'moderate';
  return 'high';
}

export function verbalizeDiaryDays(symptomDays: number): WellnessVerbalTier {
  if (symptomDays <= 0) return 'none';
  if (symptomDays === 1) return 'low';
  if (symptomDays < 3) return 'moderate';
  return 'high';
}

export function derivePrimaryWellnessFactor(breakdown: WellnessScoreBreakdown): WellnessPrimaryFactor {
  const candidates: WellnessPrimaryFactor[] = [
    { id: 'pollen', penalty: breakdown.pollenPenalty + breakdown.crossReactionPenalty },
    { id: 'air', penalty: breakdown.aqiPenalty },
    { id: 'diary', penalty: breakdown.diaryPenalty },
    { id: 'clinical', penalty: breakdown.clinicalPenalty + breakdown.multimorbidPenalty },
    { id: 'asit', penalty: breakdown.asitPenalty },
  ];
  const strongest = candidates.reduce((best, item) => (item.penalty > best.penalty ? item : best));
  if (strongest.penalty <= 0) return { id: 'none', penalty: 0 };
  return strongest;
}
