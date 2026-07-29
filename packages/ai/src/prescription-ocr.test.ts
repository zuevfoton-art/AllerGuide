import { describe, expect, it } from 'vitest';
import {
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
    expect(parsed.scheduleNotes).toContain('1 раз в сутки');
    expect(parsed.scheduleStages).toHaveLength(2);
    expect(parsed.scheduleStages[0]?.dose).toContain('1 таблетка');
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

  it('returns warnings when fields are missing', () => {
    const parsed = parsePrescriptionText('просто текст без полей');
    expect(parsed.warnings.length).toBeGreaterThan(0);
    expect(parsed.drug).toBe('');
    expect(parsed.route).toBe('');
  });

  it('provides a demo prescription parse', () => {
    const demo = getDemoPrescriptionParse();
    expect(demo.source).toBe('demo');
    expect(demo.drug.length).toBeGreaterThan(0);
    expect(demo.route).toBe('oral');
    expect(demo.endDate.length).toBeGreaterThan(0);
  });

  it('applies non-empty parsed fields onto a course draft', () => {
    const applied = applyPrescriptionParseToCourse(
      {
        drug: 'Старое',
        dosage: '',
        route: 'other' as const,
        startDate: '',
        endDate: '',
        scheduleNotes: '',
        notes: '',
        stages: undefined as
          | Array<{ from: string; to: string; dose: string }>
          | undefined,
      },
      {
        drug: 'Новый препарат',
        dosage: '1 таб.',
        route: 'oral',
        scheduleStages: [{ from: '2026-01-01', to: '2026-02-01', dose: 'утро' }],
        startDate: '2026-01-01',
        endDate: '2026-06-01',
        scheduleNotes: 'ежедневно',
        notes: 'комментарий',
        source: 'text',
        warnings: [],
      },
    );

    expect(applied.drug).toBe('Новый препарат');
    expect(applied.dosage).toBe('1 таб.');
    expect(applied.route).toBe('oral');
    expect(applied.startDate).toBe('2026-01-01');
    expect(applied.endDate).toBe('2026-06-01');
    expect(applied.scheduleNotes).toBe('ежедневно');
    expect(applied.notes).toBe('комментарий');
    expect(applied.stages).toHaveLength(1);
  });
});
