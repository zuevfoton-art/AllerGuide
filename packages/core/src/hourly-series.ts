/**
 * Generic hourly time-series helpers for near-real-time map enrichment.
 */

export type HourlySample<T> = {
  /** Unix epoch ms for the sample timestamp. */
  atMs: number;
  value: T;
};

export function parseHourlyTimestamp(isoLocal: string): number | null {
  // Open-Meteo: "2026-08-04T12:00" (no Z) — treat as local wall time via Date parse.
  const parsed = Date.parse(isoLocal.length === 16 ? `${isoLocal}:00` : isoLocal);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Linear interpolation between the two samples surrounding `atMs`.
 * If outside range, clamps to nearest endpoint.
 */
export function interpolateHourlySamples<T>(
  samples: HourlySample<T>[],
  atMs: number,
  lerp: (a: T, b: T, t: number) => T,
): T | null {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((left, right) => left.atMs - right.atMs);
  if (atMs <= sorted[0]!.atMs) return sorted[0]!.value;
  const last = sorted[sorted.length - 1]!;
  if (atMs >= last.atMs) return last.value;

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const left = sorted[i]!;
    const right = sorted[i + 1]!;
    if (atMs >= left.atMs && atMs <= right.atMs) {
      const span = right.atMs - left.atMs;
      const t = span <= 0 ? 0 : (atMs - left.atMs) / span;
      return lerp(left.value, right.value, t);
    }
  }
  return last.value;
}

export function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

/** Shortest-path lerp for degrees on a circle (0–360). */
export function lerpDegrees(a: number, b: number, t: number): number {
  const start = ((a % 360) + 360) % 360;
  let end = ((b % 360) + 360) % 360;
  let delta = end - start;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return ((start + delta * Math.min(1, Math.max(0, t))) % 360 + 360) % 360;
}

export type WindHourlyValue = {
  speedMps: number;
  directionDeg: number;
};

export function lerpWind(a: WindHourlyValue, b: WindHourlyValue, t: number): WindHourlyValue {
  return {
    speedMps: Math.max(0, lerpNumber(a.speedMps, b.speedMps, t)),
    directionDeg: lerpDegrees(a.directionDeg, b.directionDeg, t),
  };
}

export function interpolateWindAt(
  samples: HourlySample<WindHourlyValue>[],
  atMs: number = Date.now(),
): WindHourlyValue | null {
  return interpolateHourlySamples(samples, atMs, lerpWind);
}

export function interpolateUpiAt(
  samples: HourlySample<number>[],
  atMs: number = Date.now(),
): number | null {
  const value = interpolateHourlySamples(samples, atMs, lerpNumber);
  if (value == null) return null;
  return Math.min(5, Math.max(0, Math.round(value)));
}
