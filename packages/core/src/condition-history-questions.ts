import type { AllergyConditionId } from './allergy-conditions';

export const CONDITION_HISTORY_QUESTION_IDS = [
  'onsetKind',
  'onsetAge',
  'status',
  'diagnosedBy',
  'foodSymptomTiming',
  'ocularSymptoms',
  'notes',
] as const;

export type ConditionHistoryQuestionId = (typeof CONDITION_HISTORY_QUESTION_IDS)[number];

export type ConditionHistoryQuestionPage = {
  conditionId: AllergyConditionId;
  questionId: ConditionHistoryQuestionId;
};

const SHARED_QUESTIONS_BEFORE_SPECIFIC: ConditionHistoryQuestionId[] = [
  'onsetKind',
  'onsetAge',
  'status',
  'diagnosedBy',
];

/**
 * Questions shown for one allergy type. Food and rhinitis add type-specific fields.
 */
export function listConditionHistoryQuestionsForCondition(
  conditionId: AllergyConditionId,
): ConditionHistoryQuestionId[] {
  const questions: ConditionHistoryQuestionId[] = [...SHARED_QUESTIONS_BEFORE_SPECIFIC];
  if (conditionId === 'food') questions.push('foodSymptomTiming');
  if (conditionId === 'rhinitis') questions.push('ocularSymptoms');
  questions.push('notes');
  return questions;
}

export function listConditionHistoryQuestionPages(
  conditionIds: AllergyConditionId[],
): ConditionHistoryQuestionPage[] {
  return conditionIds.flatMap((conditionId) =>
    listConditionHistoryQuestionsForCondition(conditionId).map((questionId) => ({
      conditionId,
      questionId,
    })),
  );
}

/** Paginate only when several types would otherwise stack on one screen. */
export function shouldPaginateConditionHistoryQuestions(
  conditionIds: AllergyConditionId[],
): boolean {
  return conditionIds.length > 1;
}

export function clampConditionHistoryQuestionIndex(
  conditionIds: AllergyConditionId[],
  index: number,
): number {
  const pages = listConditionHistoryQuestionPages(conditionIds);
  if (pages.length === 0) return 0;
  return Math.min(Math.max(0, index), pages.length - 1);
}

export function getConditionHistoryQuestionPage(
  conditionIds: AllergyConditionId[],
  index: number,
): ConditionHistoryQuestionPage | null {
  if (!shouldPaginateConditionHistoryQuestions(conditionIds)) return null;
  const pages = listConditionHistoryQuestionPages(conditionIds);
  if (pages.length === 0) return null;
  return pages[clampConditionHistoryQuestionIndex(conditionIds, index)];
}
