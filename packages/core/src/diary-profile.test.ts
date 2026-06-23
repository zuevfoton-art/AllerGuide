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

  it('recommends ARIA and ACT scales for mixed profile', () => {
    const scales = getRecommendedScalesForProfile(['Пыльца берёзы'], ['asthma']);
    expect(scales).toEqual(expect.arrayContaining(['aria-lite', 'act']));
  });

  it('falls back to all RAACI scales when conditions unknown', () => {
    expect(getRecommendedScalesForProfile(['Молоко'])).toEqual([
      'aria-lite',
      'act',
      'scorad-lite',
    ]);
  });

  it('hides peak flow without asthma and ASIT without eligible conditions', () => {
    const foodOnly = resolveProfileConditions(['Молоко'], []);
    const visible = filterDiarySections(DIARY_SECTIONS, foodOnly).map((s) => s.type);
    expect(visible).not.toContain('Пикфлоуметрия');
    expect(visible).not.toContain('АСИТ');
    expect(visible).toContain('Симптомы');
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
