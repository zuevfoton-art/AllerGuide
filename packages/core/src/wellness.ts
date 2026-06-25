import type { ClinicalScaleId, ScaleScoreResult } from './clinical-scales';
import { inferScaleLevelFromTotal } from './clinical-scales';
import type { DiaryInsights } from './diary-stats';
import type { ScaleTrendEntry } from './diary-profile';
import type { OpenMeteoPollenTaxonId } from './pollen-taxonomy';
import { classifyPollenConcentration } from './pollen-thresholds';
import {
  computeCrossReactionWellnessPenalty,
  type PollenExposure,
} from './wellness-cross-reactions';
import { WELLNESS_WEIGHTS, WELLNESS_WEIGHTS_VERSION } from './wellness-weights';

export type WellnessLevel = 'good' | 'moderate' | 'attention' | 'high-risk';
export type WellnessConfidence = 'high' | 'medium' | 'low';

export interface WellnessFactor {
  id: string;
  label: string;
  value: string;
  level: 'low' | 'mid' | 'high';
  source: string;
}

export interface WellnessRecommendation {
  icon: string;
  title: string;
  text: string;
}

export interface WellnessPollenMatch {
  label: string;
  value: number;
  profileRelevant: boolean;
  taxonId?: OpenMeteoPollenTaxonId;
  allergenId?: string | null;
}

export interface WellnessClinicalScale {
  scaleId: ClinicalScaleId;
  level: ScaleScoreResult['level'];
  total: number;
  label: string;
}

export interface WellnessDiarySeries {
  symptomDays: number;
  triggerDays: number;
  streak: number;
  weekTotal: number;
  correlationKind: DiaryInsights['correlationKind'];
}

export interface WellnessInput {
  profileAllergenIds: string[];
  pollenMatches: WellnessPollenMatch[];
  europeanAqi: number | null;
  pm25: number | null;
  diary: WellnessDiarySeries;
  clinicalScales: WellnessClinicalScale[];
  foodAllergens: string[];
  envDataAvailable: boolean;
  /** @deprecated Use `diary.symptomDays > 0` — kept for transitional callers */
  recentSymptoms?: boolean;
  /** @deprecated Use `diary.triggerDays > 0` */
  recentTriggers?: boolean;
}

export interface WellnessScoreBreakdown {
  score: number;
  pollenPenalty: number;
  aqiPenalty: number;
  diaryPenalty: number;
  clinicalPenalty: number;
  crossReactionPenalty: number;
  crossReactionMatches: ReturnType<typeof computeCrossReactionWellnessPenalty>['matches'];
  weightsVersion: string;
}

export function pollenTier(
  value: number,
  taxonId?: OpenMeteoPollenTaxonId,
): { level: 'low' | 'mid' | 'high'; label: string; penalty: number } {
  const level = taxonId ? classifyPollenConcentration(value, taxonId) : classifyPollenConcentration(value, 'birch_pollen');
  const labels = { low: 'Низкий', mid: 'Средний', high: 'Высокий' };
  return { level, label: labels[level], penalty: WELLNESS_WEIGHTS.pollen[level] };
}

export function aqiTier(value: number | null): { level: 'low' | 'mid' | 'high'; label: string; penalty: number } {
  if (value == null) return { level: 'mid', label: 'Нет данных', penalty: WELLNESS_WEIGHTS.aqi.noData };
  if (value <= 20) return { level: 'low', label: 'Хорошо', penalty: WELLNESS_WEIGHTS.aqi.low };
  if (value <= 50) return { level: 'mid', label: 'Умеренно', penalty: WELLNESS_WEIGHTS.aqi.mid };
  if (value <= 75) return { level: 'mid', label: 'Повышен', penalty: 12 };
  return { level: 'high', label: 'Плохо', penalty: 20 };
}

function clinicalScalePenalty(level: ScaleScoreResult['level']): number {
  if (level === 'good') return 0;
  if (level === 'moderate') return WELLNESS_WEIGHTS.clinicalScale.moderate;
  if (level === 'severe') return WELLNESS_WEIGHTS.clinicalScale.severe;
  return WELLNESS_WEIGHTS.clinicalScale.uncontrolled;
}

export function buildDiarySeriesFromInsights(insights: DiaryInsights): WellnessDiarySeries {
  return {
    symptomDays: insights.days.filter((d) => d.hasSymptoms).length,
    triggerDays: insights.days.filter((d) => d.hasTrigger).length,
    streak: insights.streak,
    weekTotal: insights.weekTotal,
    correlationKind: insights.correlationKind,
  };
}

export function buildClinicalScalesFromTrends(trends: ScaleTrendEntry[]): WellnessClinicalScale[] {
  return trends.map((trend) => ({
    scaleId: trend.scaleId,
    level: inferScaleLevelFromTotal(trend.scaleId, trend.total),
    total: trend.total,
    label: trend.label,
  }));
}

export function computeDiaryPenalty(diary: WellnessDiarySeries): number {
  let penalty = diary.symptomDays * WELLNESS_WEIGHTS.diarySymptomDay;
  penalty += diary.triggerDays * WELLNESS_WEIGHTS.diaryTriggerDay;
  if (diary.streak >= 3) penalty += WELLNESS_WEIGHTS.diaryStreakBonus;
  if (diary.correlationKind === 'symptom-trigger' || diary.correlationKind === 'symptom-food') {
    penalty += WELLNESS_WEIGHTS.diaryCorrelationBonus;
  }
  return penalty;
}

export function computeWellnessConfidence(input: {
  envDataAvailable: boolean;
  diaryWeekTotal: number;
  clinicalScalesCount: number;
}): WellnessConfidence {
  const { envDataAvailable, diaryWeekTotal, clinicalScalesCount } = input;
  const diaryRich = diaryWeekTotal >= 3 || clinicalScalesCount > 0;

  if (envDataAvailable && diaryRich) return 'high';
  if (envDataAvailable || diaryWeekTotal >= 1) return 'medium';
  return 'low';
}

export function computeWellnessScoreBreakdown(input: WellnessInput): WellnessScoreBreakdown {
  let pollenPenalty = 0;
  const pollenExposures: PollenExposure[] = [];

  for (const match of input.pollenMatches) {
    if (!match.profileRelevant) continue;
    const tier = pollenTier(match.value, match.taxonId);
    pollenPenalty += tier.penalty;
    if (match.allergenId) {
      pollenExposures.push({ allergenId: match.allergenId, tier: tier.level });
    }
  }

  const aqiPenalty = aqiTier(input.europeanAqi).penalty;
  const diaryPenalty = computeDiaryPenalty(input.diary);

  let clinicalPenalty = 0;
  for (const scale of input.clinicalScales) {
    clinicalPenalty += clinicalScalePenalty(scale.level);
  }

  const crossResult = computeCrossReactionWellnessPenalty(input.profileAllergenIds, pollenExposures);

  const totalPenalty =
    pollenPenalty + aqiPenalty + diaryPenalty + clinicalPenalty + crossResult.penalty;

  const score = Math.max(
    WELLNESS_WEIGHTS.scoreMin,
    Math.min(WELLNESS_WEIGHTS.scoreMax, WELLNESS_WEIGHTS.scoreMax - totalPenalty),
  );

  return {
    score,
    pollenPenalty,
    aqiPenalty,
    diaryPenalty,
    clinicalPenalty,
    crossReactionPenalty: crossResult.penalty,
    crossReactionMatches: crossResult.matches,
    weightsVersion: WELLNESS_WEIGHTS_VERSION,
  };
}

export function computeWellnessScore(input: WellnessInput): number {
  return computeWellnessScoreBreakdown(input).score;
}

export function wellnessStatusFromScore(score: number): { title: string; summary: string; level: WellnessLevel } {
  if (score >= 80) {
    return {
      title: 'Хорошо',
      summary: 'Среда и записи дневника не указывают на повышенные риски.',
      level: 'good',
    };
  }
  if (score >= 60) {
    return {
      title: 'Умеренно',
      summary: 'Есть отдельные факторы внимания — см. рекомендации.',
      level: 'moderate',
    };
  }
  if (score >= 40) {
    return {
      title: 'Повышенное внимание',
      summary: 'Несколько факторов могут влиять на самочувствие.',
      level: 'attention',
    };
  }
  return {
    title: 'Высокий риск',
    summary: 'Рекомендуем минимизировать триггеры и проконсультироваться с врачом.',
    level: 'high-risk',
  };
}

export function buildWellnessRecommendations(input: WellnessInput): WellnessRecommendation[] {
  const recs: WellnessRecommendation[] = [];
  const breakdown = computeWellnessScoreBreakdown(input);

  for (const match of input.pollenMatches) {
    const tier = pollenTier(match.value, match.taxonId);
    if (match.profileRelevant && tier.level !== 'low') {
      recs.push({
        icon: '🌿',
        title: 'Снизьте контакт с пыльцой',
        text: `Уровень пыльцы «${match.label}» ${tier.label.toLowerCase()}. Ограничьте прогулки в дневные часы пикового пыления.`,
      });
    }
  }

  const aqi = aqiTier(input.europeanAqi);
  if (input.envDataAvailable && aqi.level !== 'low') {
    recs.push({
      icon: '💨',
      title: 'Качество воздуха',
      text: `Индекс EAQI ${aqi.label.toLowerCase()}. Чувствительным людям стоит сократить активность на открытом воздухе.`,
    });
  }

  if (input.diary.symptomDays >= 2) {
    recs.push({
      icon: '📔',
      title: 'Симптомы в дневнике',
      text: `За последние 7 дней симптомы зафиксированы ${input.diary.symptomDays} дн. Отслеживайте динамику; при ухудшении обратитесь к врачу.`,
    });
  } else if (input.diary.symptomDays === 1) {
    recs.push({
      icon: '📔',
      title: 'Симптомы в дневнике',
      text: 'За последнюю неделю зафиксированы симптомы. Отслеживайте динамику.',
    });
  }

  for (const scale of input.clinicalScales) {
    if (scale.level !== 'good') {
      recs.push({
        icon: '📊',
        title: `Шкала ${scale.label}`,
        text: `Последняя оценка: ${scale.total} баллов (${scale.level}). Обсудите контроль с врачом.`,
      });
    }
  }

  if (breakdown.crossReactionMatches.length) {
    const names = breakdown.crossReactionMatches.slice(0, 2).map((m) => m.allergen.name);
    recs.push({
      icon: '🔗',
      title: 'Возможные перекрёстные реакции',
      text: `При повышенной пыльце возможна реакция на: ${names.join(', ')}. Учитывайте при питании и на улице.`,
    });
  }

  if (input.foodAllergens.length) {
    recs.push({
      icon: '📷',
      title: 'Пищевые аллергены',
      text: `В профиле: ${input.foodAllergens.join(', ')}. Проверяйте состав через сканер перед покупкой новых продуктов.`,
    });
  }

  if (!recs.length) {
    recs.push({
      icon: '✅',
      title: 'Стабильный день',
      text: 'Показатели среды и записи дневника не указывают на повышенные риски.',
    });
  }

  return recs.slice(0, 4);
}

export { WELLNESS_WEIGHTS_VERSION };
