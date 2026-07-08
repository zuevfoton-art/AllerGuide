import { describe, expect, it } from 'vitest';
import { encodeDiaryDetails } from './diary';
import {
  DOCTOR_REPORT_BLOCKS,
  computePefTrend,
  formatPefTrendSummary,
  getDefaultReportBlockIds,
  getReportDiaryTypes,
  periodToDays,
} from './doctor-report';

describe('doctor report helpers', () => {
  it('computes PEF trend from diary entries', () => {
    const trend = computePefTrend([
      {
        type: 'Пикфлоуметрия',
        details: encodeDiaryDetails({ pefValue: '320', pefBest: '400' }),
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
    expect(trend.personalBest).toBe(400);
    expect(trend.latestZone).toBe('green');
    expect(trend.latestPercentOfBest).toBe(80);
  });

  it('uses plan personal best when entry best is missing', () => {
    const trend = computePefTrend(
      [
        {
          type: 'Пикфлоуметрия',
          details: encodeDiaryDetails({ pefValue: '180' }),
          createdAt: '2026-06-20T08:00:00',
        },
      ],
      { planPersonalBest: '400' },
    );
    expect(trend.latestZone).toBe('red');
    expect(trend.personalBest).toBe(400);
  });

  it('formats PEF trend summary with zone', () => {
    const summary = formatPefTrendSummary({
      count: 1,
      min: 280,
      max: 280,
      latest: 280,
      latestAt: '2026-06-20',
      personalBest: 400,
      latestPercentOfBest: 70,
      latestZone: 'yellow',
    });
    expect(summary).toContain('Жёлтая зона');
    expect(summary).toContain('70%');
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

  it('includes triggerContext in default report blocks', () => {
    expect(getDefaultReportBlockIds()).toContain('triggerContext');
    expect(getDefaultReportBlockIds()).toContain('asthma');
  });
});
