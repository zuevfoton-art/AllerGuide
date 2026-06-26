/**
 * Beta calibration metrics — Pearson ρ between wellness score and ACT/ARIA (E.4).
 */

export const BETA_METRICS_TARGET_RHO = 0.5;

export interface BetaCalibrationObservation {
  wellnessScore: number;
  actTotal?: number;
  ariaTotal?: number;
  observedAt: string;
}

export interface BetaCorrelationResult {
  rho: number | null;
  sampleSize: number;
  meetsTarget: boolean;
}

export interface BetaCalibrationReport {
  act: BetaCorrelationResult;
  aria: BetaCorrelationResult;
  weightsVersion?: string;
  targetRho: number;
}

/** Higher burden = worse health (inverse of wellness score 0–100). */
export function wellnessBurdenScore(wellnessScore: number): number {
  const clamped = Math.min(100, Math.max(0, wellnessScore));
  return 100 - clamped;
}

/** ACT total 5–25; lower total = worse control → higher burden. */
export function actBurdenScore(actTotal: number): number {
  const clamped = Math.min(25, Math.max(5, actTotal));
  return 25 - clamped;
}

/** ARIA-lite total 0–12; higher total = worse symptoms. */
export function ariaBurdenScore(ariaTotal: number): number {
  return Math.min(12, Math.max(0, ariaTotal));
}

/**
 * Pearson product-moment correlation coefficient.
 * Returns null when fewer than 2 pairs or zero variance.
 */
export function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 2) return null;

  const n = xs.length;
  const meanX = xs.reduce((sum, v) => sum + v, 0) / n;
  const meanY = ys.reduce((sum, v) => sum + v, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  if (denX === 0 || denY === 0) return null;
  return num / Math.sqrt(denX * denY);
}

function correlateBurden(
  observations: BetaCalibrationObservation[],
  pickClinical: (obs: BetaCalibrationObservation) => number | undefined,
  toBurden: (clinical: number) => number,
): BetaCorrelationResult {
  const wellness: number[] = [];
  const clinical: number[] = [];

  for (const obs of observations) {
    const value = pickClinical(obs);
    if (value === undefined) continue;
    wellness.push(wellnessBurdenScore(obs.wellnessScore));
    clinical.push(toBurden(value));
  }

  const rho = pearsonCorrelation(wellness, clinical);
  return {
    rho,
    sampleSize: wellness.length,
    meetsTarget: rho !== null && rho >= BETA_METRICS_TARGET_RHO,
  };
}

export function computeActWellnessCorrelation(
  observations: BetaCalibrationObservation[],
): BetaCorrelationResult {
  return correlateBurden(observations, (obs) => obs.actTotal, actBurdenScore);
}

export function computeAriaWellnessCorrelation(
  observations: BetaCalibrationObservation[],
): BetaCorrelationResult {
  return correlateBurden(observations, (obs) => obs.ariaTotal, ariaBurdenScore);
}

export function evaluateBetaCalibration(
  observations: BetaCalibrationObservation[],
  targetRho = BETA_METRICS_TARGET_RHO,
  weightsVersion?: string,
): BetaCalibrationReport {
  const act = computeActWellnessCorrelation(observations);
  const aria = computeAriaWellnessCorrelation(observations);

  const meets = (result: BetaCorrelationResult) =>
    result.rho !== null && result.rho >= targetRho;

  return {
    act: { ...act, meetsTarget: meets(act) },
    aria: { ...aria, meetsTarget: meets(aria) },
    weightsVersion,
    targetRho,
  };
}

/** Synthetic beta cohort for regression tests and demo dashboards. */
export function buildSyntheticBetaCohort(size = 12): BetaCalibrationObservation[] {
  const out: BetaCalibrationObservation[] = [];
  for (let i = 0; i < size; i++) {
    const t = size <= 1 ? 0 : i / (size - 1);
    const wellnessScore = Math.round(95 - t * 70);
    const actTotal = Math.round(24 - t * 14);
    const ariaTotal = Math.round(t * 11);
    out.push({
      wellnessScore: Math.max(15, wellnessScore),
      actTotal: Math.max(5, actTotal),
      ariaTotal,
      observedAt: new Date(Date.UTC(2026, 0, 1 + i)).toISOString(),
    });
  }
  return out;
}
