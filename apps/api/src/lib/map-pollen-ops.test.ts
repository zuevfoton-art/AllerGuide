import { beforeEach, describe, expect, it } from 'vitest';
import type { AnalyticsEventPayload } from '@allerguide/core';
import {
  buildMapPollenOpsHealth,
  resetMapPollenOpsAlertStateForTests,
} from './map-pollen-ops';

function event(
  name: 'map_pollen_refreshed' | 'map_pollen_fallback',
  hoursAgo: number,
  extra: Record<string, string | number> = {},
): AnalyticsEventPayload {
  return {
    event: name,
    at: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
    ...extra,
  };
}

describe('map-pollen-ops', () => {
  beforeEach(() => {
    resetMapPollenOpsAlertStateForTests();
    delete process.env.MAP_POLLEN_OPS_MIN_SAMPLES;
    delete process.env.MAP_POLLEN_OPS_FALLBACK_THRESHOLD;
  });

  it('computes fallback rate and alerts when above threshold', () => {
    process.env.MAP_POLLEN_OPS_MIN_SAMPLES = '6';
    process.env.MAP_POLLEN_OPS_FALLBACK_THRESHOLD = '0.3';

    const events = [
      ...Array.from({ length: 6 }, () => event('map_pollen_fallback', 1, { reason: 'google_unavailable' })),
      ...Array.from({ length: 6 }, () => event('map_pollen_refreshed', 1, { source: 'cache' })),
    ];

    const health = buildMapPollenOpsHealth(events);
    expect(health.fallbacks).toBe(6);
    expect(health.refreshed).toBe(6);
    expect(health.fallbackRate).toBeCloseTo(1, 2);
    expect(health.alert).toBe(true);
    expect(health.reasons.google_unavailable).toBe(6);
  });

  it('uses refreshed count as denominator (partial fallback share)', () => {
    process.env.MAP_POLLEN_OPS_MIN_SAMPLES = '10';
    process.env.MAP_POLLEN_OPS_FALLBACK_THRESHOLD = '0.3';

    const events = [
      ...Array.from({ length: 4 }, () => event('map_pollen_fallback', 1, { reason: 'google_unavailable' })),
      ...Array.from({ length: 10 }, () => event('map_pollen_refreshed', 1, { source: 'google' })),
    ];

    const health = buildMapPollenOpsHealth(events);
    expect(health.fallbackRate).toBeCloseTo(0.4, 2);
    expect(health.alert).toBe(true);
  });

  it('does not alert below min samples', () => {
    process.env.MAP_POLLEN_OPS_MIN_SAMPLES = '50';
    const events = [
      event('map_pollen_fallback', 0),
      event('map_pollen_refreshed', 0),
    ];
    expect(buildMapPollenOpsHealth(events).alert).toBe(false);
  });
});
