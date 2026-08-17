import type { AllergyConditionId } from './allergy-conditions';
import { GINA_ACT_PROMPT_INTERVAL_DAYS } from './gina-asthma';
import {
  ALLERGY_CONDITION_TYPES,
  profileEnablesAsit,
  profileEnablesPeakFlow,
} from './allergy-conditions';
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
  urticaria: 'uas7',
};

const ALWAYS_VISIBLE_SECTIONS = new Set([
  'Симптомы',
  'Лекарство',
  'Питание',
  'Триггер',
  'Кожа',
  'Заметка',
  'Визит к врачу',
  'Терапия',
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
    if (URTICARIA_MARKERS.some((marker) => lower.includes(marker))) ids.add('urticaria');
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
  void allergies;
  return [...explicit];
}

export function getRecommendedScalesForConditions(
  conditions: AllergyConditionId[],
): ClinicalScaleId[] {
  const scales = new Set<ClinicalScaleId>();
  for (const conditionId of conditions) {
    const scaleId = SCALE_BY_CONDITION[conditionId];
    if (scaleId) scales.add(scaleId);
  }
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
  const scales = new Set(getRecommendedScalesForConditions(explicit));
  if (profileSuggestsUas7(allergies) || explicit.includes('urticaria')) scales.add('uas7');
  return [...scales];
}

export function isDiarySectionVisible(
  sectionType: string,
  conditions: AllergyConditionId[],
): boolean {
  if (ALWAYS_VISIBLE_SECTIONS.has(sectionType)) return true;
  if (sectionType === 'Пикфлоуметрия') return profileEnablesPeakFlow(conditions);
  if (sectionType === 'АСИТ') return profileEnablesAsit(conditions);
  if (sectionType === 'Укус насекомого') {
    return conditions.includes('insect');
  }
  return true;
}

export function filterDiarySections<T extends { type: string }>(
  sections: T[],
  conditions: AllergyConditionId[],
): T[] {
  return sections.filter((section) => isDiarySectionVisible(section.type, conditions));
}

/** Picker order for «Новая запись»: always-on types, then scale, then gated modules. */
export const DIARY_ENTRY_PICKER_IDS = [
  'Симптомы',
  'Лекарство',
  'Питание',
  'Триггер',
  'Кожа',
  'Заметка',
  'Шкала',
  'Визит к врачу',
  'Пикфлоуметрия',
  'Укус насекомого',
] as const;

export type DiaryEntryPickerId = (typeof DIARY_ENTRY_PICKER_IDS)[number];

export type DiaryEntryPickerKind = 'section' | 'scale';

export interface DiaryEntryPickerOption {
  id: DiaryEntryPickerId;
  kind: DiaryEntryPickerKind;
  sectionType: string;
  recommendedScaleIds: ClinicalScaleId[];
}

export type CourseSetupId = 'therapy' | 'asit';

export interface CourseSetupOption {
  id: CourseSetupId;
  available: boolean;
}

/**
 * Profile-gated options for the diary «Что добавить» picker.
 * Course dose-log types (АСИТ, Терапия) stay on module cards, not in this list.
 */
export function buildDiaryEntryPickerOptions(input: {
  gatingConditions: AllergyConditionId[];
  recommendedScaleIds?: ClinicalScaleId[];
}): DiaryEntryPickerOption[] {
  const recommendedScaleIds = [...(input.recommendedScaleIds ?? [])];
  const options: DiaryEntryPickerOption[] = [];

  for (const id of DIARY_ENTRY_PICKER_IDS) {
    if (id === 'Шкала') {
      options.push({
        id,
        kind: 'scale',
        sectionType: 'Шкала',
        recommendedScaleIds,
      });
      continue;
    }

    if (!isDiarySectionVisible(id, input.gatingConditions)) continue;

    options.push({
      id,
      kind: 'section',
      sectionType: id,
      recommendedScaleIds: [],
    });
  }

  return options;
}

/** Course setup choices: therapy is always offered; ASIT only when the profile enables it. */
export function buildCourseSetupOptions(input: { asitEnabled: boolean }): CourseSetupOption[] {
  return [
    { id: 'therapy', available: true },
    { id: 'asit', available: input.asitEnabled },
  ];
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

/** @deprecated use GINA_ACT_PROMPT_INTERVAL_DAYS from gina-asthma */
export const ACT_PROMPT_INTERVAL_DAYS = GINA_ACT_PROMPT_INTERVAL_DAYS;

export function getLastScaleEntryAt(
  entries: { type: string; details: string; createdAt: string }[],
  scaleId: ClinicalScaleId,
): string | null {
  for (const entry of entries) {
    if (entry.type !== 'Шкала') continue;
    const payload = decodeDiaryDetails(entry.details);
    if (!payload) continue;
    const id = getScaleIdFromAnswers(payload.answers);
    if (id === scaleId) return entry.createdAt;
  }
  return null;
}

/** C.4: prompt ACT when asthma profile and last ACT entry is older than GINA 4-week window. */
export function isActPromptDue(
  entries: { type: string; details: string; createdAt: string }[],
  conditions: AllergyConditionId[],
): boolean {
  if (!conditions.includes('asthma')) return false;
  const lastAt = getLastScaleEntryAt(entries, 'act');
  if (!lastAt) return true;
  const daysSince = (Date.now() - new Date(lastAt).getTime()) / 86_400_000;
  return daysSince >= ACT_PROMPT_INTERVAL_DAYS;
}

export function daysSinceActEntry(
  entries: { type: string; details: string; createdAt: string }[],
): number | null {
  const lastAt = getLastScaleEntryAt(entries, 'act');
  if (!lastAt) return null;
  return Math.floor((Date.now() - new Date(lastAt).getTime()) / 86_400_000);
}
