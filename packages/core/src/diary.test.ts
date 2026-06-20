import { describe, expect, it } from 'vitest';
import {
  DIARY_SECTIONS,
  decodeDiaryDetails,
  encodeDiaryDetails,
  formatDiaryEntrySummary,
  hasSectionAnswers,
  validateDiarySectionStep,
} from './diary';

describe('diary schema', () => {
  it('defines sequential steps for each diary section', () => {
    expect(DIARY_SECTIONS).toHaveLength(6);
    for (const section of DIARY_SECTIONS) {
      expect(section.steps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('encodes and decodes structured diary details', () => {
    const encoded = encodeDiaryDetails({ symptoms: 'Зуд', intensity: '3 — умеренно' });
    const decoded = decodeDiaryDetails(encoded);
    expect(decoded?.answers.symptoms).toBe('Зуд');
    expect(decoded?.answers.intensity).toBe('3 — умеренно');
  });

  it('formats structured summary for history cards', () => {
    const details = encodeDiaryDetails({
      medicine: 'Цетиризин',
      dosage: '10 мг',
    });
    const summary = formatDiaryEntrySummary('Лекарство', details);
    expect(summary).toContain('Цетиризин');
    expect(summary).toContain('10 мг');
  });

  it('keeps legacy plain-text entries readable', () => {
    expect(formatDiaryEntrySummary('Заметка', 'Старый текст записи')).toBe('Старый текст записи');
  });

  it('validates required step answers', () => {
    const section = DIARY_SECTIONS[0];
    expect(validateDiarySectionStep(section, 0, {})).toMatch(/Заполните поле/);
    expect(validateDiarySectionStep(section, 0, { symptoms: 'Кашель' })).toBeNull();
  });

  it('detects when a section has answers', () => {
    const section = DIARY_SECTIONS[2];
    expect(hasSectionAnswers(section, {})).toBe(false);
    expect(hasSectionAnswers(section, { food: 'Суп' })).toBe(true);
  });
});
