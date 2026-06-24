import type { AllergyConditionId } from './allergy-conditions';
import {
  ALLERGY_CONDITION_TYPES,
  profileEnablesAsit,
  profileEnablesPeakFlow,
} from './allergy-conditions';
import { profileEnablesInsectFocus } from './insect-allergy';
import {
  CLINICAL_SCALES,
  computeScaleScore,
  getScaleIdFromAnswers,
  type ClinicalScaleId,
} from './clinical-scales';
import { decodeDiaryDetails } from './diary';

/** Шкалы дневника по ориентирам РААКИ: ринит, астма, атопический дерматит, крапивница. */
export const RAACI_SCALE_IDS: ClinicalScaleId[] = ['aria-lite', 'act', 'scorad-lite'];

/** Шкалы, отображаемые в трендах дневника (включая UAS7). */
export const DIARY_TREND_SCALE_IDS: ClinicalScaleId[] = [...RAACI_SCALE_IDS, 'uas7'];

const SCALE_BY_CONDITION: Partial<Record<AllergyConditionId, ClinicalScaleId>> = {
  rhinitis: 'aria-lite',
  pollinosis: 'aria-lite',
  asthma: 'act',
  dermatitis: 'scorad-lite',
};

const ALWAYS_VISIBLE_SECTIONS = new Set([
  'Симптомы',
  'Лекарство',
  'Питание',
  'Триггер',
  'Кожа',
  'Заметка',
  'Визит к врачу',
]);

const POLLEN_PATTERN =
  /пыльц|берёз|берез|ольх|лещин|амброз|полын|тимоф|злак|клён|клен|ясень|ива|топол|растени/i;
const ASTHMA_MARKERS = ['астм', 'бронх'];
const DERMATITIS_MARKERS = ['дерматит', 'экзем', 'нейродерм', 'атопическ'];
const RHINITIS_MARKERS = ['ринит', 'насморк', 'поллиноз'];
const FOOD_MARKERS = [
  'молок',
  'яйц',
  'орех',
  'арахис',
  'рыб',
  'морепродукт',
  'соя',
  'пшениц',
  'глютен',
  'кунжут',
];
const DRUG_MARKERS = ['аспирин', 'ибупрофен', 'пенициллин', 'антибиот', 'нпвп', 'нпвс', 'парацетамол'];
const URTICARIA_MARKERS = ['крапивниц', 'urticaria', 'urticari'];
const INSECT_MARKERS = ['пчел', 'пчёл', 'ос', 'шершн', 'комар', 'насеком', 'укус'];

export function inferConditionIdsFromAllergies(allergies: string[]): AllergyConditionId[] {
  const ids = new Set<AllergyConditionId>();

  for (const name of allergies) {
    const lower = name.toLowerCase().trim();
    if (!lower) continue;

    if (POLLEN_PATTERN.test(lower)) {
      ids.add('pollinosis');
      ids.add('rhinitis');
    }
    if (ASTHMA_MARKERS.some((marker) => lower.includes(marker))) ids.add('asthma');
    if (DERMATITIS_MARKERS.some((marker) => lower.includes(marker))) ids.add('dermatitis');
    if (RHINITIS_MARKERS.some((marker) => lower.includes(marker))) ids.add('rhinitis');
    if (FOOD_MARKERS.some((marker) => lower.includes(marker))) ids.add('food');
    if (DRUG_MARKERS.some((marker) => lower.includes(marker))) ids.add('drug');
    if (INSECT_MARKERS.some((marker) => lower.includes(marker))) ids.add('insect');

    for (const condition of ALLERGY_CONDITION_TYPES) {
      if (lower.includes(condition.label.toLowerCase())) {
        ids.add(condition.id);
      }
      for (const option of condition.options ?? []) {
        if (lower.includes(option.label.toLowerCase())) {
          ids.add(condition.id);
        }
      }
    }
  }

  return [...ids];
}

export function resolveProfileConditions(
  allergies: string[],
  explicit: AllergyConditionId[] = [],
): AllergyConditionId[] {
  const merged = new Set<AllergyConditionId>([
    ...explicit,
    ...inferConditionIdsFromAllergies(allergies),
  ]);
  return [...merged];
}

export function getRecommendedScalesForConditions(
  conditions: AllergyConditionId[],
): ClinicalScaleId[] {
  const scales = new Set<ClinicalScaleId>();
  for (const conditionId of conditions) {
    const scaleId = SCALE_BY_CONDITION[conditionId];
    if (scaleId) scales.add(scaleId);
  }
  if (!scales.size) return [...RAACI_SCALE_IDS];
  return [...scales];
}

function profileSuggestsUas7(allergies: string[]): boolean {
  return allergies.some((name) => {
    const lower = name.toLowerCase();
    return URTICARIA_MARKERS.some((marker) => lower.includes(marker));
  });
}

export function getRecommendedScalesForProfile(
  allergies: string[],
  explicit: AllergyConditionId[] = [],
): ClinicalScaleId[] {
  const scales = new Set(getRecommendedScalesForConditions(resolveProfileConditions(allergies, explicit)));
  if (profileSuggestsUas7(allergies)) scales.add('uas7');
  return [...scales];
}

export function isDiarySectionVisible(
  sectionType: string,
  conditions: AllergyConditionId[],
): boolean {
  if (ALWAYS_VISIBLE_SECTIONS.has(sectionType)) return true;
  if (sectionType === 'Пикфлоуметрия') return profileEnablesPeakFlow(conditions);
  if (sectionType === 'АСИТ') return profileEnablesAsit(conditions);
  if (sectionType === 'Укус насекомого') return profileEnablesInsectFocus(conditions);
  return true;
}

export function filterDiarySections<T extends { type: string }>(
  sections: T[],
  conditions: AllergyConditionId[],
): T[] {
  return sections.filter((section) => isDiarySectionVisible(section.type, conditions));
}

export interface ScaleTrendEntry {
  scaleId: ClinicalScaleId;
  label: string;
  total: number;
  interpretation: string;
  at: string;
}

export function collectLatestScaleTrends(
  entries: { type: string; details: string; createdAt: string }[],
): ScaleTrendEntry[] {
  const latest = new Map<ClinicalScaleId, ScaleTrendEntry>();

  for (const entry of entries) {
    if (entry.type !== 'Шкала') continue;
    const payload = decodeDiaryDetails(entry.details);
    if (!payload) continue;

    const scaleId = getScaleIdFromAnswers(payload.answers);
    if (!scaleId || !DIARY_TREND_SCALE_IDS.includes(scaleId)) continue;
    if (latest.has(scaleId)) continue;

    const score =
      payload.answers.scaleScore && payload.answers.scaleInterpretation
        ? {
            total: Number(payload.answers.scaleScore),
            interpretation: payload.answers.scaleInterpretation,
            level: 'good' as const,
          }
        : computeScaleScore(scaleId, payload.answers);
    if (!score || !Number.isFinite(score.total)) continue;

    const meta = CLINICAL_SCALES.find((item) => item.id === scaleId);
    latest.set(scaleId, {
      scaleId,
      label: meta?.shortLabel ?? scaleId,
      total: score.total,
      interpretation: score.interpretation,
      at: entry.createdAt,
    });
  }

  return DIARY_TREND_SCALE_IDS.filter((id) => latest.has(id)).map((id) => latest.get(id)!);
}
