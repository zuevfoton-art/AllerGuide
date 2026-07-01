import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetStartupMetricsForTests,
  getStartupMetrics,
  markStartupPhase,
} from './startup-metrics';

describe('startup-metrics', () => {
  beforeEach(() => {
    __resetStartupMetricsForTests();
  });

  it('records relative phase timings from the first mark', () => {
    markStartupPhase('layout_mount');
    markStartupPhase('init_db_start');
    markStartupPhase('app_ready');

    const metrics = getStartupMetrics();
    expect(metrics.layout_mount).toBe(0);
    expect(metrics.init_db_start).toBeGreaterThanOrEqual(0);
    expect(metrics.app_ready).toBeGreaterThanOrEqual(metrics.init_db_start ?? 0);
  });
});
