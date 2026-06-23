import { describe, expect, it } from 'vitest';
import { encodeDiaryDetails } from './diary';
import { computePefTrend } from './doctor-report';

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
});
