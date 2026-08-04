import { describe, expect, it } from 'vitest';
import {
  interpolateUpiAt,
  interpolateWindAt,
  lerpDegrees,
  parseHourlyTimestamp,
  type HourlySample,
  type WindHourlyValue,
} from './hourly-series';

describe('hourly-series', () => {
  it('parses open-meteo local timestamps', () => {
    expect(parseHourlyTimestamp('2026-08-04T12:00')).toBeTypeOf('number');
  });

  it('lerps degrees across 0°', () => {
    expect(lerpDegrees(350, 10, 0.5)).toBeCloseTo(0, 5);
  });

  it('interpolates wind between hours', () => {
    const t0 = Date.parse('2026-08-04T10:00:00Z');
    const t1 = Date.parse('2026-08-04T12:00:00Z');
    const samples: HourlySample<WindHourlyValue>[] = [
      { atMs: t0, value: { speedMps: 2, directionDeg: 270 } },
      { atMs: t1, value: { speedMps: 6, directionDeg: 270 } },
    ];
    const mid = interpolateWindAt(samples, (t0 + t1) / 2);
    expect(mid?.speedMps).toBeCloseTo(4, 5);
    expect(mid?.directionDeg).toBeCloseTo(270, 5);
  });

  it('interpolates UPI and clamps', () => {
    const t0 = Date.parse('2026-08-04T00:00:00Z');
    const t1 = Date.parse('2026-08-04T12:00:00Z');
    expect(
      interpolateUpiAt(
        [
          { atMs: t0, value: 1 },
          { atMs: t1, value: 5 },
        ],
        (t0 + t1) / 2,
      ),
    ).toBe(3);
  });
});
