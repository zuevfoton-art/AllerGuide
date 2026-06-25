import { describe, expect, it } from 'vitest';
import {
  buildScaleInitialAnswers,
  computeScaleScore,
  enrichScaleAnswers,
  formatScaleSummary,
  getClinicalScaleSection,
  validateClinicalScale,
} from './clinical-scales';

describe('clinical scales', () => {
  it('builds scale sections with required steps', () => {
    const aria = getClinicalScaleSection('aria-lite');
    expect(aria.type).toBe('Шкала');
    expect(aria.steps.length).toBe(4);
  });

  it('validates ARIA-lite answers', () => {
    const answers = {
      ...buildScaleInitialAnswers('aria-lite'),
      ariaCongestion: '1',
      ariaRhinorrhea: '2',
      ariaSneezing: '1',
      ariaItching: '0 — нет',
    };
    expect(validateClinicalScale(answers)).toBeNull();
    const score = computeScaleScore('aria-lite', answers);
    expect(score?.total).toBe(4);
    expect(score?.interpretation).toContain('Умерен');
  });

  it('validates ACT answers and interprets control', () => {
    const answers = {
      ...buildScaleInitialAnswers('act'),
      actActivity: '5',
      actBreath: '5',
      actNight: '4',
      actReliever: '5',
      actControl: '5',
    };
    expect(validateClinicalScale(answers)).toBeNull();
    const score = computeScaleScore('act', answers);
    expect(score?.total).toBe(24);
    expect(score?.level).toBe('good');
  });

  it('rejects incomplete scale answers', () => {
    expect(validateClinicalScale({ scaleId: 'act' })).toMatch(/Заполните поле/);
  });

  it('formats scale summary for diary history', () => {
    const summary = formatScaleSummary({
      scaleId: 'uas7',
      uasWheals: '1–6',
      uasItch: '2 — умеренный',
    });
    expect(summary).toContain('UAS7');
    expect(summary).toContain('баллов');
  });

  it('scores SCORAD-lite and UAS7', () => {
    const scorad = computeScaleScore('scorad-lite', {
      scoradExtent: '20',
      scoradItch: '5–6',
      scoradSleep: '1 — лёгкое',
    });
    expect(scorad?.total).toBeGreaterThan(0);

    const uas = computeScaleScore('uas7', {
      uasWheals: '>12',
      uasItch: '3 — сильный',
    });
    expect(uas?.level).toBe('severe');
  });

  it('enriches scale answers with score metadata for diary storage', () => {
    const enriched = enrichScaleAnswers({
      ...buildScaleInitialAnswers('aria-lite'),
      ariaCongestion: '1',
      ariaRhinorrhea: '1',
      ariaSneezing: '1',
      ariaItching: '0 — нет',
    });
    expect(enriched.scaleScore).toBe('3');
    expect(enriched.scaleInterpretation).toBeTruthy();
  });
});
