import { describe, expect, it } from 'vitest';
import {
  BETA_METRICS_TARGET_RHO,
  actBurdenScore,
  buildSyntheticBetaCohort,
  evaluateBetaCalibration,
  pearsonCorrelation,
  wellnessBurdenScore,
} from './beta-metrics';

describe('beta-metrics (E.4)', () => {
  it('computes perfect positive correlation', () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 5);
  });

  it('returns null for insufficient data', () => {
    expect(pearsonCorrelation([1], [2])).toBeNull();
  });

  it('maps wellness and ACT to aligned burden scales', () => {
    expect(wellnessBurdenScore(80)).toBe(20);
    expect(actBurdenScore(20)).toBe(5);
  });

  it('synthetic cohort meets beta ρ target for ACT and ARIA', () => {
    const report = evaluateBetaCalibration(buildSyntheticBetaCohort(14));
    expect(report.targetRho).toBe(BETA_METRICS_TARGET_RHO);
    expect(report.act.rho).not.toBeNull();
    expect(report.act.rho!).toBeGreaterThanOrEqual(BETA_METRICS_TARGET_RHO);
    expect(report.aria.rho).not.toBeNull();
    expect(report.aria.rho!).toBeGreaterThanOrEqual(BETA_METRICS_TARGET_RHO);
    expect(report.act.meetsTarget).toBe(true);
    expect(report.aria.meetsTarget).toBe(true);
  });
});
