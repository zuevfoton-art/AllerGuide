import { describe, expect, it } from 'vitest';
import {
  getDemoPrescriptionParse,
  parsePrescriptionText,
} from './prescription-ocr';

describe('prescription-ocr', () => {
  it('parses drug, start date and schedule stages from text', () => {
    const text = [
      'Препарат: Сталораль Берёза 300 IR',
      'Дозировка: по схеме',
      'Начало: 2026-03-01',
      'Этап 1 (2026-03-01 – 2026-05-31): 1 доза утром',
      'Этап 2 (2026-06-01 – 2026-11-30): поддерживающая доза',
      'Заметки: Натощак',
    ].join('\n');

    const parsed = parsePrescriptionText(text);
    expect(parsed.source).toBe('text');
    expect(parsed.drug).toContain('Сталораль');
    expect(parsed.startDate).toBe('2026-03-01');
    expect(parsed.scheduleStages).toHaveLength(2);
    expect(parsed.scheduleStages[0]?.dose).toContain('1 доза');
    expect(parsed.notes).toContain('Натощак');
  });

  it('returns warnings when fields are missing', () => {
    const parsed = parsePrescriptionText('просто текст без полей');
    expect(parsed.warnings.length).toBeGreaterThan(0);
    expect(parsed.drug).toBe('');
  });

  it('provides a demo prescription parse', () => {
    const demo = getDemoPrescriptionParse();
    expect(demo.source).toBe('demo');
    expect(demo.drug.length).toBeGreaterThan(0);
    expect(demo.scheduleStages.length).toBeGreaterThan(0);
  });
});
