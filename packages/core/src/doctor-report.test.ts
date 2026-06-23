import { describe, expect, it } from 'vitest';
import { encodeDiaryDetails } from './diary';
import {
  DOCTOR_REPORT_BLOCKS,
  computePefTrend,
  getDefaultReportBlockIds,
  getReportDiaryTypes,
  periodToDays,
} from './doctor-report';

describe('doctor report helpers', () => {
  it('computes PEF trend from diary entries', () => {
    const trend = computePefTrend([
      {
        type: 'Пикфлоуметрия',
        details: encodeDiaryDetails({ pefValue: '320' }),
        createdAt: '2026-06-20T08:00:00',
      },
      {
        type: 'Пикфлоуметрия',
        details: encodeDiaryDetails({ pefValue: '280' }),
        createdAt: '2026-06-19T08:00:00',
      },
    ]);

    expect(trend.count).toBe(2);
    expect(trend.min).toBe(280);
    expect(trend.max).toBe(320);
    expect(trend.latest).toBe(320);
  });

  it('includes scales block in default report configuration', () => {
    const defaultIds = getDefaultReportBlockIds();
    expect(defaultIds).toContain('scales');
    expect(defaultIds).not.toContain('notes');
  });

  it('maps selected blocks to diary types including scales', () => {
    const types = getReportDiaryTypes(['scales', 'symptoms']);
    expect(types).toContain('Шкала');
    expect(types).toContain('Симптомы');
  });

  it('exposes scales block in report blocks catalog', () => {
    const scales = DOCTOR_REPORT_BLOCKS.find((block) => block.id === 'scales');
    expect(scales?.diaryTypes).toEqual(['Шкала']);
  });

  it('converts fixed periods to day counts', () => {
    expect(periodToDays(7)).toBe(7);
    expect(periodToDays('custom')).toBeNull();
  });
});
