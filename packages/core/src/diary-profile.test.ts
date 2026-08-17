import { describe, expect, it } from 'vitest';
import {
  buildCourseSetupOptions,
  buildDiaryEntryPickerOptions,
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

  it('builds entry picker without course dose logs and gated modules', () => {
    const options = buildDiaryEntryPickerOptions({
      gatingConditions: ['food'],
      recommendedScaleIds: [],
    });
    const ids = options.map((option) => option.id);
    expect(ids).toEqual([
      'Симптомы',
      'Лекарство',
      'Питание',
      'Триггер',
      'Кожа',
      'Заметка',
      'Шкала',
      'Визит к врачу',
    ]);
    expect(ids).not.toContain('АСИТ');
    expect(ids).not.toContain('Терапия');
    expect(ids).not.toContain('Пикфлоуметрия');
    expect(ids).not.toContain('Укус насекомого');
  });

  it('includes peak flow and insect sting when those conditions are explicit', () => {
    const options = buildDiaryEntryPickerOptions({
      gatingConditions: ['asthma', 'insect'],
      recommendedScaleIds: ['act'],
    });
    const ids = options.map((option) => option.id);
    expect(ids).toContain('Пикфлоуметрия');
    expect(ids).toContain('Укус насекомого');
    expect(ids).not.toContain('АСИТ');
    const scale = options.find((option) => option.kind === 'scale');
    expect(scale?.recommendedScaleIds).toEqual(['act']);
  });

  it('does not add ASIT to the entry picker for pollinosis', () => {
    const ids = buildDiaryEntryPickerOptions({
      gatingConditions: ['pollinosis'],
    }).map((option) => option.id);
    expect(ids).not.toContain('АСИТ');
    expect(ids).toContain('Визит к врачу');
  });

  it('offers therapy always and ASIT only when enabled', () => {
    expect(buildCourseSetupOptions({ asitEnabled: false })).toEqual([
      { id: 'therapy', available: true },
      { id: 'asit', available: false },
    ]);
    expect(buildCourseSetupOptions({ asitEnabled: true })).toEqual([
      { id: 'therapy', available: true },
      { id: 'asit', available: true },
    ]);
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
