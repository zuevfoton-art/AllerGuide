import { describe, expect, it } from 'vitest';
import {
  collectLatestScaleTrends,
  filterDiarySections,
  getRecommendedScalesForProfile,
  inferConditionIdsFromAllergies,
  resolveProfileConditions,
} from './diary-profile';
import { DIARY_SECTIONS, encodeDiaryDetails } from './diary';
import { buildScaleInitialAnswers, enrichScaleAnswers } from './clinical-scales';

describe('diary-profile', () => {
  it('infers rhinitis from pollen allergens', () => {
    const ids = inferConditionIdsFromAllergies(['Пыльца берёзы']);
    expect(ids).toContain('pollinosis');
    expect(ids).toContain('rhinitis');
  });

  it('recommends scales only for explicit gating conditions', () => {
    expect(getRecommendedScalesForProfile(['Молоко'], ['food'])).toEqual([]);
  });

  it('recommends ARIA and ACT scales for mixed explicit profile', () => {
    const scales = getRecommendedScalesForProfile(['Пыльца берёзы'], ['asthma', 'pollinosis']);
    expect(scales).toEqual(expect.arrayContaining(['aria-lite', 'act']));
  });

  it('recommends UAS7 for explicit urticaria condition', () => {
    const scales = getRecommendedScalesForProfile(['Молоко'], ['urticaria']);
    expect(scales).toContain('uas7');
  });

  it('recommends UAS7 when urticaria is in profile allergies', () => {
    const scales = getRecommendedScalesForProfile(['Крапивница'], []);
    expect(scales).toContain('uas7');
  });

  it('does not fallback to all RAACI scales when conditions unknown', () => {
    expect(getRecommendedScalesForProfile(['Молоко'], [])).toEqual([]);
  });

  it('hides peak flow without asthma and ASIT without eligible conditions', () => {
    const foodOnly = resolveProfileConditions(['Молоко'], ['food']);
    const visible = filterDiarySections(DIARY_SECTIONS, foodOnly).map((s) => s.type);
    expect(visible).not.toContain('Пикфлоуметрия');
    expect(visible).not.toContain('АСИТ');
    expect(visible).toContain('Симптомы');
  });

  it('does not show ASIT when only pollen allergen inferred without explicit type', () => {
    const visible = filterDiarySections(DIARY_SECTIONS, []).map((s) => s.type);
    expect(visible).not.toContain('АСИТ');
    expect(visible).not.toContain('Пикфлоуметрия');
  });

  it('shows peak flow for asthma profile', () => {
    const visible = filterDiarySections(DIARY_SECTIONS, ['asthma']).map((s) => s.type);
    expect(visible).toContain('Пикфлоуметрия');
  });

  it('collects latest RAACI scale trends from diary entries', () => {
    const actAnswers = enrichScaleAnswers({
      ...buildScaleInitialAnswers('act'),
      actActivity: '5',
      actBreath: '5',
      actNight: '4',
      actReliever: '5',
      actControl: '5',
    });
    const trends = collectLatestScaleTrends([
      {
        type: 'Шкала',
        details: encodeDiaryDetails(actAnswers),
        createdAt: '2026-06-20T10:00:00.000Z',
      },
    ]);
    expect(trends).toHaveLength(1);
    expect(trends[0]?.scaleId).toBe('act');
    expect(trends[0]?.total).toBe(24);
  });
});
