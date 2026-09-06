import {
  computePefPercentOfBest,
  computePefZone,
  computeScaleScore,
  getScaleIdFromAnswers,
  parsePefNumeric,
  resolvePersonalBestPef,
  type PefZone,
  type ScaleScoreResult,
} from '@allerguide/core';

export function diaryScalePreview(
  sectionType: string,
  isLastStep: boolean,
  answers: Record<string, string>,
): ScaleScoreResult | null {
  if (sectionType !== 'Шкала' || !isLastStep) return null;
  const scaleId = getScaleIdFromAnswers(answers);
  return scaleId ? computeScaleScore(scaleId, answers) : null;
}

export function diaryPefZonePreview(
  sectionType: string,
  answers: Record<string, string>,
  planPersonalBestPef?: number | null,
): { zone: PefZone; percent: number | null } | null {
  if (sectionType !== 'Пикфлоуметрия') return null;
  const value = parsePefNumeric(answers.pefValue);
  if (!value) return null;
  const personalBest = resolvePersonalBestPef({
    explicitBest: answers.pefBest,
    planBest: planPersonalBestPef,
  });
  if (!personalBest) return null;
  const zone = computePefZone(value, personalBest);
  if (!zone) return null;
  const percent = computePefPercentOfBest(value, personalBest);
  return { zone, percent };
}
