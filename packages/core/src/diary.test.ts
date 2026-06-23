import { describe, expect, it } from 'vitest';
import {
  DIARY_SECTIONS,
  decodeDiaryDetails,
  encodeDiaryDetails,
  formatDiaryDate,
  formatDiaryEntrySummary,
  getDiaryEntryAnswers,
  getDiarySection,
  hasSectionAnswers,
  validateDiarySectionStep,
} from './diary';

describe('diary schema', () => {
  it('defines sequential steps for each diary section', () => {
    expect(DIARY_SECTIONS).toHaveLength(9);
    for (const section of DIARY_SECTIONS) {
      expect(section.steps.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('includes trigger context fields for diary-trigger linking', () => {
    const trigger = getDiarySection('Триггер');
    const ids = trigger?.steps.map((step) => step.id) ?? [];
    expect(ids).toContain('pollenContext');
    expect(ids).toContain('recentScan');
    expect(ids).toContain('todayMeds');
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

  it('formats clinical scale entry summary from enriched answers', () => {
    const details = encodeDiaryDetails({
      scaleId: 'act',
      actActivity: '4',
      actBreath: '4',
      actNight: '4',
      actReliever: '5',
      actControl: '5',
    });
    const summary = formatDiaryEntrySummary('Шкала', details);
    expect(summary).toContain('22 баллов');
    expect(summary).toContain('Хороший контроль');
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

  it('formats diary dates for history cards', () => {
    const reference = new Date('2026-06-20T15:00:00');
    expect(formatDiaryDate('2026-06-20T14:30:00', reference)).toBe('Сегодня, 14:30');
    expect(formatDiaryDate('2026-06-19T09:15:00', reference)).toBe('Вчера, 09:15');
    expect(formatDiaryDate('2026-06-10T16:45:00', reference)).toBe('10 июн, 16:45');
    expect(formatDiaryDate('2025-12-01T08:00:00', reference)).toBe('1 дек 2025, 08:00');
  });

  it('extracts answers for editing structured and legacy entries', () => {
    const structured = encodeDiaryDetails({ food: 'Суп' });
    expect(getDiaryEntryAnswers('Питание', structured)).toEqual({ food: 'Суп' });
    expect(getDiaryEntryAnswers('Заметка', 'Старый текст')).toEqual({ noteBody: 'Старый текст' });
    expect(getDiaryEntryAnswers('Симптомы', 'Старый текст')).toBeNull();
  });
});
