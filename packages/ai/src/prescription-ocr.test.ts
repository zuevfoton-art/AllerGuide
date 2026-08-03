import { describe, expect, it } from 'vitest';
import { createEmptyAsitClinicalDiagnosis } from '@allerguide/core';
import {
  applyPrescriptionParseToAsitCourse,
  applyPrescriptionParseToCourse,
  getDemoPrescriptionParse,
  parsePrescriptionText,
} from './prescription-ocr';

describe('prescription-ocr', () => {
  it('parses drug, dosage, route, dates, schedule and stages from text', () => {
    const text = [
      'Препарат: Монтелукаст 10 мг',
      'Дозировка: 1 таблетка вечером',
      'Путь введения: Пероральный',
      'Дата начала: 2026-03-01',
      'Дата окончания: 2026-08-31',
      'Схема приёма: 1 таблетка 1 раз в сутки',
      'Этап 1 (2026-03-01 – 2026-05-31): 1 таблетка вечером',
      'Этап 2 (2026-06-01 – 2026-08-31): поддерживающая доза',
      'Заметки: Натощак',
    ].join('\n');

    const parsed = parsePrescriptionText(text);
    expect(parsed.source).toBe('text');
    expect(parsed.drug).toContain('Монтелукаст');
    expect(parsed.dosage).toContain('1 таблетка');
    expect(parsed.route).toBe('oral');
    expect(parsed.startDate).toBe('2026-03-01');
    expect(parsed.endDate).toBe('2026-08-31');
    expect(parsed.scheduleStages).toHaveLength(2);
    expect(parsed.scheduleLines.length).toBeGreaterThanOrEqual(2);
    expect(parsed.scheduleNotes).toContain('1 таблетка вечером');
    expect(parsed.notes).toContain('Натощак');
  });

  it('parses dotted dates and inhaled route aliases', () => {
    const parsed = parsePrescriptionText(
      [
        'Препарат: Будесонид',
        'Дозировка: 2 вдоха',
        'Путь введения: ингаляционный',
        'Дата начала: 01.04.2026',
        'Дата окончания: 30.09.2026',
      ].join('\n'),
    );
    expect(parsed.route).toBe('inhaled');
    expect(parsed.startDate).toBe('2026-04-01');
    expect(parsed.endDate).toBe('2026-09-30');
  });

  it('parses ASIT SLIT route and clinical diagnosis sections', () => {
    const parsed = parsePrescriptionText(
      [
        'Клинический диагноз',
        'Основное заболевание: Аллергический ринит',
        'Сопутствующее заболевание: Атопический дерматит',
        'Рекомендации: Промывание носа',
        'Диета: Без сырых яблок',
        'План обследования: IgE через 6 мес.',
        'Другое: Обучение технике',
        'Препарат: Сталораль',
        'Дозировка: 2 нажатия',
        'Путь введения: Подъязычная (SLIT)',
        'Дата начала: 2026-03-01',
        'Дата окончания: 2026-12-01',
        'Схема приёма:',
        '1. Дни 1–3: 1 нажатие',
        '2. Дни 4–7: 2 нажатия',
        'Этап 1 (2026-03-01 – 2026-03-31): наращивание',
        'Этап 2 (2026-04-01 – 2026-12-01): поддержка',
      ].join('\n'),
    );

    expect(parsed.asitRoute).toBe('slit');
    expect(parsed.clinicalDiagnosis.primaryDisease).toContain('ринит');
    expect(parsed.clinicalDiagnosis.concomitantDisease).toContain('дерматит');
    expect(parsed.clinicalDiagnosis.recommendations).toContain('Промывание');
    expect(parsed.clinicalDiagnosis.diet).toContain('яблок');
    expect(parsed.clinicalDiagnosis.examPlan).toContain('IgE');
    expect(parsed.clinicalDiagnosis.other).toContain('Обучение');
    expect(parsed.scheduleStages).toHaveLength(2);
    expect(parsed.scheduleLines.length).toBeGreaterThanOrEqual(2);
  });

  it('returns warnings when fields are missing', () => {
    const parsed = parsePrescriptionText('просто текст без полей');
    expect(parsed.warnings.length).toBeGreaterThan(0);
    // Unlabeled heuristics treat the first substance-like line as the drug.
    expect(parsed.drug).toContain('просто');
    expect(parsed.route).toBe('');
  });

  it('infers drug, dosage and schedule from unlabeled RU OCR text', () => {
    const parsed = parsePrescriptionText(
      [
        'Рецепт',
        'Rp: Монтелукаст 10 мг',
        'по 1 таблетке вечером',
        '1 раз в сутки',
        'курс 30 дней',
      ].join('\n'),
    );
    expect(parsed.drug).toMatch(/Монтелукаст/);
    expect(parsed.dosage.length).toBeGreaterThan(0);
    expect(parsed.scheduleLines.some((line) => /раз в сутки|вечером|курс/i.test(line))).toBe(
      true,
    );
  });

  it('infers drug from plain multiline OCR without Rp label', () => {
    const parsed = parsePrescriptionText(
      ['Фексофенадин', '180 мг 1 раз в день', 'утром'].join('\n'),
    );
    expect(parsed.drug).toContain('Фексофенадин');
    expect(parsed.dosage).toMatch(/180|раз в день/i);
  });

  it('provides a demo prescription parse with clinical diagnosis', () => {
    const demo = getDemoPrescriptionParse();
    expect(demo.source).toBe('demo');
    expect(demo.drug.length).toBeGreaterThan(0);
    expect(demo.asitRoute).toBe('slit');
    expect(demo.clinicalDiagnosis.primaryDisease.length).toBeGreaterThan(0);
    expect(demo.scheduleLines.length).toBeGreaterThan(1);
  });

  it('applies non-empty parsed fields onto a course draft', () => {
    const parsed = parsePrescriptionText(
      [
        'Препарат: Монтелукаст',
        'Дозировка: 1 таблетка',
        'Путь введения: Пероральный',
        'Дата начала: 2026-03-01',
        'Дата окончания: 2026-08-31',
        'Схема приёма:',
        '1. Вечером ежедневно',
        'Этап 1 (2026-03-01 – 2026-05-31): 1 таблетка',
      ].join('\n'),
    );
    const applied = applyPrescriptionParseToCourse(
      {
        drug: 'Старое',
        dosage: '',
        route: 'other' as const,
        startDate: '',
        endDate: '',
        scheduleNotes: '',
        scheduleLines: [''],
        notes: '',
        stages: undefined as
          | Array<{ from: string; to: string; dose: string }>
          | undefined,
      },
      parsed,
    );

    expect(applied.drug).toContain('Монтелукаст');
    expect(applied.dosage).toContain('таблетка');
    expect(applied.route).toBe('oral');
    expect(applied.startDate).toBe('2026-03-01');
    expect(applied.endDate).toBe('2026-08-31');
    expect(applied.scheduleLines?.length).toBeGreaterThan(0);
    expect(applied.stages?.length).toBe(1);
  });

  it('applies OCR fields and clinical diagnosis onto an ASIT course', () => {
    const applied = applyPrescriptionParseToAsitCourse(
      {
        drug: '',
        dosage: '',
        route: 'scit' as const,
        startDate: '',
        endDate: '',
        scheduleNotes: '',
        scheduleLines: [''],
        scheduleStages: undefined as
          | Array<{ from: string; to: string; dose: string }>
          | undefined,
        clinicalDiagnosis: createEmptyAsitClinicalDiagnosis(),
      },
      getDemoPrescriptionParse(),
    );

    expect(applied.drug).toContain('Сталораль');
    expect(applied.dosage).toContain('нажатия');
    expect(applied.route).toBe('slit');
    expect(applied.startDate).toBe('2026-03-01');
    expect(applied.endDate).toBe('2026-08-31');
    expect(applied.scheduleLines?.length).toBeGreaterThan(1);
    expect(applied.scheduleStages?.length).toBe(2);
    expect(applied.clinicalDiagnosis?.primaryDisease).toMatch(/ринит/i);
    expect(applied.clinicalDiagnosis?.diet).toBeTruthy();
  });
});
