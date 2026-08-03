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
  parseDiaryPhotoUris,
  parseMultiChoiceValue,
  serializeDiaryPhotoUris,
  toggleMultiChoiceValue,
  validateDiarySectionStep,
} from './diary';

describe('diary schema', () => {
  it('defines sequential steps for each diary section', () => {
    expect(DIARY_SECTIONS).toHaveLength(11);
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

  it('encodes and decodes structured diary details with severity enrichment', () => {
    const encoded = encodeDiaryDetails(
      { symptoms: 'чихание', symptomCode: 'Чихание', severity0_3: '2 — умеренная' },
      'Симптомы',
    );
    const decoded = decodeDiaryDetails(encoded);
    expect(decoded?.answers.symptoms).toBe('чихание');
    expect(decoded?.answers.severity).toBe('2');
    expect(decoded?.answers.symptomCodes).toContain('sneezing');
  });

  it('allows multi-select on the catalog symptom step', () => {
    const section = getDiarySection('Симптомы')!;
    const step = section.steps.find((item) => item.id === 'symptomCode');
    expect(step?.multiSelect).toBe(true);
    expect(step?.label).toMatch(/Симптом/);
  });

  it('toggles multi-choice labels without losing prior selections', () => {
    const once = toggleMultiChoiceValue('', 'Чихание');
    const twice = toggleMultiChoiceValue(once, 'Зуд глаз');
    expect(parseMultiChoiceValue(twice)).toEqual(['Чихание', 'Зуд глаз']);
    expect(parseMultiChoiceValue(toggleMultiChoiceValue(twice, 'Чихание'))).toEqual(['Зуд глаз']);
  });

  it('encodes multi-select symptom labels into coded fields', () => {
    const encoded = encodeDiaryDetails(
      {
        symptoms: 'зуд глаз и чихание',
        symptomCode: 'Зуд глаз\nЧихание',
        severity0_3: '2 — умеренная',
      },
      'Симптомы',
    );
    const decoded = decodeDiaryDetails(encoded);
    expect(decoded?.answers.symptomCodes).toContain('ocular-itching');
    expect(decoded?.answers.symptomCodes).toContain('sneezing');
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
    const section = getDiarySection('Симптомы')!;
    expect(validateDiarySectionStep(section, 1, {})).toMatch(/Заполните поле/);
    expect(validateDiarySectionStep(section, 1, { symptoms: 'Кашель' })).toBeNull();
  });

  it('detects when a section has answers', () => {
    const section = DIARY_SECTIONS[2];
    expect(hasSectionAnswers(section, {})).toBe(false);
    expect(hasSectionAnswers(section, { food: 'Суп' })).toBe(true);
  });

  it('includes optional photo step on skin section', () => {
    const skin = getDiarySection('Кожа');
    expect(skin?.steps.some((step) => step.id === 'skinPhotos' && step.field === 'photo')).toBe(true);
  });

  it('skips photo uris in skin entry summaries and strips them from encoded details', () => {
    const details = encodeDiaryDetails(
      {
        skinArea: 'Лицо',
        appearance: 'Сыпь',
        itching: 'Сильный',
        skinPhotos: JSON.stringify(['file:///tmp/a.jpg']),
      },
      'Кожа',
    );
    const summary = formatDiaryEntrySummary('Кожа', details);
    expect(summary).toContain('Лицо');
    expect(summary).not.toContain('file://');
    expect(decodeDiaryDetails(details)?.answers.skinPhotos).toBeUndefined();
  });

  it('serializes and parses diary photo uris with a max of 5', () => {
    const raw = serializeDiaryPhotoUris(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(parseDiaryPhotoUris(raw)).toEqual(['a', 'b', 'c', 'd', 'e']);
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
