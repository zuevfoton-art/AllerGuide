import { describe, expect, it } from 'vitest';
import {
  derivePrimaryWellnessFactor,
  verbalizeDiaryDays,
  verbalizePm25,
  verbalizePollenValue,
  verbalizeWellnessIndex,
} from './wellness-display';
import { WELLNESS_WEIGHTS_VERSION } from './wellness-weights';

describe('wellness-display', () => {
  it('maps index 48 to moderate risk', () => {
    expect(verbalizeWellnessIndex(48)).toBe('moderate');
    expect(verbalizeWellnessIndex(90)).toBe('low');
    expect(verbalizeWellnessIndex(20)).toBe('high');
  });

  it('maps pollen 0 to none and PM2.5 35.6 to moderate', () => {
    expect(verbalizePollenValue(0)).toBe('none');
    expect(verbalizePm25(35)).toBe('moderate');
    expect(verbalizePm25(35.6)).toBe('high');
    expect(verbalizeDiaryDays(0)).toBe('none');
  });

  it('picks the strongest penalty as the primary factor', () => {
    const factor = derivePrimaryWellnessFactor({
      score: 48,
      pollenPenalty: 0,
      aqiPenalty: 16,
      diaryPenalty: 0,
      clinicalPenalty: 4,
      asitPenalty: 0,
      crossReactionPenalty: 0,
      multimorbidPenalty: 0,
      crossReactionMatches: [],
      weightsVersion: WELLNESS_WEIGHTS_VERSION,
    });
    expect(factor.id).toBe('air');
  });
});
