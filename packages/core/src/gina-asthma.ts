/**
 * GINA (Global Initiative for Asthma) — единый клинический источник для всей
 * астма-логики в AllerGuide. Пороги, интервалы и контент должны ссылаться сюда.
 *
 * @see https://ginasthma.org/reports/
 */

export const GINA_SOURCE = {
  id: 'GINA',
  name: 'Global Initiative for Asthma',
  reportUrl: 'https://ginasthma.org/reports/',
  /** Версия для evidence-registry и аудита. */
  version: 'GINA-2024',
} as const;

/** ACT: хороший контроль (GINA + validated ACT). */
export const GINA_ACT_GOOD_MIN = 20;
/** ACT: частичный контроль (нижняя граница). */
export const GINA_ACT_PARTIAL_MIN = 16;
/** ACT: неконтролируемая астма — ≤15. */
export const GINA_ACT_UNCONTROLLED_MAX = 15;
export const GINA_ACT_SCORE_MIN = 5;
export const GINA_ACT_SCORE_MAX = 25;

/** ПСВ: зелёная зона — ≥80 % personal best (GINA traffic-light). */
export const GINA_PEF_GREEN_MIN_PERCENT = 80;
/** ПСВ: жёлтая зона — 50–79 %. */
export const GINA_PEF_YELLOW_MIN_PERCENT = 50;

/** ACT оценивает последние 4 недели — напоминание с тем же интервалом. */
export const GINA_ACT_PROMPT_INTERVAL_DAYS = 28;

export const GINA_ASTHMA_DISCLAIMER =
  'Астма-функции носят информационный характер по ориентирам GINA. Пороги, терапия и план действий определяет лечащий врач.';

export const GINA_ASTHMA_ATTRIBUTION =
  'Ориентиры по контролю астмы основаны на публичных рекомендациях Global Initiative for Asthma (GINA). ' +
  `Полный отчёт: ${GINA_SOURCE.reportUrl}`;

export type GinaActControlLevel = 'good' | 'partial' | 'uncontrolled';

export interface GinaActBand {
  level: GinaActControlLevel;
  interpretation: string;
}

export const GINA_ASTHMA_FEATURE_IDS = [
  'pef-zones',
  'act-scale',
  'act-prompt',
  'asthma-action-plan',
  'asthma-expert-content',
  'asthma-doctor-report',
  'asthma-diary-section',
] as const;

export type GinaAsthmaFeatureId = (typeof GINA_ASTHMA_FEATURE_IDS)[number];

/** Экспертные статьи, обязанные ссылаться на GINA в теле или тегах. */
export const GINA_ASTHMA_EXPERT_ARTICLE_IDS = [
  'asthma-diary',
  'asthma-pef-basics',
  'asthma-act-basics',
  'asthma-triggers',
  'asthma-when-to-see-doctor',
] as const;

export type GinaAsthmaExpertArticleId = (typeof GINA_ASTHMA_EXPERT_ARTICLE_IDS)[number];

export function isGinaAsthmaExpertArticle(id: string): id is GinaAsthmaExpertArticleId {
  return (GINA_ASTHMA_EXPERT_ARTICLE_IDS as readonly string[]).includes(id);
}

export function classifyActScoreGina(total: number): GinaActBand | null {
  if (!Number.isFinite(total) || total < GINA_ACT_SCORE_MIN || total > GINA_ACT_SCORE_MAX) {
    return null;
  }
  if (total >= GINA_ACT_GOOD_MIN) {
    return { level: 'good', interpretation: 'Хороший контроль (GINA / ACT)' };
  }
  if (total >= GINA_ACT_PARTIAL_MIN) {
    return { level: 'partial', interpretation: 'Частичный контроль (GINA / ACT)' };
  }
  return {
    level: 'uncontrolled',
    interpretation: 'Недостаточный контроль — консультация врача (GINA / ACT)',
  };
}

/** Маппинг GINA ACT band → уровень для wellness / UI. */
export function ginaActLevelToScaleLevel(
  level: GinaActControlLevel,
): 'good' | 'moderate' | 'uncontrolled' {
  if (level === 'good') return 'good';
  if (level === 'partial') return 'moderate';
  return 'uncontrolled';
}
