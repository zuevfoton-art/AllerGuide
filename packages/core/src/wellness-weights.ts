/**
 * Wellness scoring weights — beta-calibrated defaults (B.9).
 * Versioned registry for expert-panel tuning and E.4 correlation studies.
 */
export const WELLNESS_WEIGHTS_VERSION = 'beta-1.0';

export interface WellnessWeightSet {
  pollen: Record<'low' | 'mid' | 'high', number>;
  aqi: Record<'low' | 'mid' | 'high' | 'noData', number>;
  /** Per symptom-day in the 7-day window (max 7). */
  diarySymptomDay: number;
  /** Per trigger-day in the 7-day window. */
  diaryTriggerDay: number;
  /** Bonus when logging streak ≥ 3 days. */
  diaryStreakBonus: number;
  /** Bonus when symptom–trigger correlation detected. */
  diaryCorrelationBonus: number;
  clinicalScale: Record<'moderate' | 'severe' | 'uncontrolled', number>;
  crossReaction: Record<'high' | 'medium' | 'low', number>;
  scoreMin: number;
  scoreMax: number;
}

/** Default weights — subject to clinical validation (E.4 beta metrics). */
export const WELLNESS_WEIGHTS: WellnessWeightSet = {
  pollen: { low: 0, mid: 12, high: 28 },
  aqi: { low: 0, mid: 6, high: 12, noData: 5 },
  diarySymptomDay: 6,
  diaryTriggerDay: 3,
  diaryStreakBonus: 4,
  diaryCorrelationBonus: 6,
  clinicalScale: { moderate: 8, severe: 16, uncontrolled: 22 },
  crossReaction: { high: 12, medium: 8, low: 4 },
  scoreMin: 5,
  scoreMax: 100,
};
