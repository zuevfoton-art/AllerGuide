import { describe, expect, it } from 'vitest';
import { diaryPefZonePreview, diaryScalePreview } from './diary-wizard-preview';

const actAnswers = {
  scaleId: 'act',
  actActivity: '5',
  actBreath: '5',
  actNight: '4',
  actReliever: '5',
  actControl: '5',
};

describe('diaryScalePreview', () => {
  it('returns a score only on the last step of Шкала', () => {
    const preview = diaryScalePreview('Шкала', true, actAnswers);
    expect(preview?.total).toBe(24);
    expect(preview?.level).toBe('good');
  });

  it('returns null before the last Шкала step', () => {
    expect(diaryScalePreview('Шкала', false, actAnswers)).toBeNull();
  });

  it('returns null for a non-scale section even on the last step', () => {
    expect(diaryScalePreview('Питание', true, actAnswers)).toBeNull();
  });
});

describe('diaryPefZonePreview', () => {
  it('returns null without a PEF value or personal best', () => {
    expect(diaryPefZonePreview('Пикфлоуметрия', {})).toBeNull();
    expect(diaryPefZonePreview('Пикфлоуметрия', { pefValue: '360' })).toBeNull();
    expect(diaryPefZonePreview('Пикфлоуметрия', { pefBest: '400' })).toBeNull();
    expect(diaryPefZonePreview('Питание', { pefValue: '360', pefBest: '400' })).toBeNull();
  });

  it('returns the zone when value and personal best are present', () => {
    expect(diaryPefZonePreview('Пикфлоуметрия', { pefValue: '360', pefBest: '400' })).toEqual({
      zone: 'green',
      percent: 90,
    });
  });

  it('uses plan personal best when the answer has no explicit best', () => {
    expect(diaryPefZonePreview('Пикфлоуметрия', { pefValue: '180' }, 400)).toEqual({
      zone: 'red',
      percent: 45,
    });
  });
});
