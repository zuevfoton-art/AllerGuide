import { describe, expect, it } from 'vitest';
import {
  clampConditionHistoryQuestionIndex,
  getConditionHistoryQuestionPage,
  listConditionHistoryQuestionPages,
  listConditionHistoryQuestionsForCondition,
  shouldPaginateConditionHistoryQuestions,
} from './condition-history-questions';

describe('condition-history-questions', () => {
  it('keeps a single allergy type on one combined screen', () => {
    expect(shouldPaginateConditionHistoryQuestions(['pollinosis'])).toBe(false);
    expect(getConditionHistoryQuestionPage(['pollinosis'], 0)).toBeNull();
  });

  it('paginates when the user selected several types', () => {
    expect(shouldPaginateConditionHistoryQuestions(['pollinosis', 'food'])).toBe(true);
  });

  it('adds food timing and rhinitis ocular questions only for those types', () => {
    expect(listConditionHistoryQuestionsForCondition('pollinosis')).toEqual([
      'onsetKind',
      'onsetAge',
      'status',
      'diagnosedBy',
      'notes',
    ]);
    expect(listConditionHistoryQuestionsForCondition('food')).toContain('foodSymptomTiming');
    expect(listConditionHistoryQuestionsForCondition('rhinitis')).toContain('ocularSymptoms');
  });

  it('walks types in order, one question per page', () => {
    const pages = listConditionHistoryQuestionPages(['pollinosis', 'food']);
    expect(pages[0]).toEqual({ conditionId: 'pollinosis', questionId: 'onsetKind' });
    expect(pages[1]).toEqual({ conditionId: 'pollinosis', questionId: 'onsetAge' });
    expect(pages.filter((page) => page.conditionId === 'pollinosis')).toHaveLength(5);
    expect(pages.filter((page) => page.conditionId === 'food')).toHaveLength(6);
    expect(pages[pages.length - 1]).toEqual({ conditionId: 'food', questionId: 'notes' });
  });

  it('clamps the question index to the last page', () => {
    expect(clampConditionHistoryQuestionIndex(['food', 'asthma'], -3)).toBe(0);
    const last = listConditionHistoryQuestionPages(['food', 'asthma']).length - 1;
    expect(clampConditionHistoryQuestionIndex(['food', 'asthma'], 99)).toBe(last);
    expect(getConditionHistoryQuestionPage(['food', 'asthma'], 99)?.questionId).toBe('notes');
  });
});
