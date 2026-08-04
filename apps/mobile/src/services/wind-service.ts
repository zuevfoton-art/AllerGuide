import {
  interpolateWindAt,
  parseHourlyTimestamp,
  type HourlySample,
  type WindHourlyValue,
} from '@allerguide/core';
import { logCaughtError } from '@/src/services/error-reporting';

export interface WindSnapshot {
  /** Wind speed at 10 m (m/s). */
  speedMps: number;
  /** Meteorological direction the wind blows FROM (degrees, 0 = north). */
  directionDeg: number;
  updatedAt: string;
  /** Optional hourly series used for near-real-time interpolation. */
  hourly?: HourlySample<WindHourlyValue>[];
}

interface OpenMeteoWindResponse {
  current?: {
    wind_speed_10m?: number | null;
    wind_direction_10m?: number | null;
    time?: string;
  };
  hourly?: {
    time?: string[];
    wind_speed_10m?: (number | null)[];
    wind_direction_10m?: (number | null)[];
  };
}

/**
 * Near-real-time wind for map plume animation.
 * Uses Open-Meteo Forecast API (not air-quality) — independent of wellness pollen.
 */
export async function fetchWindSnapshot(
  latitude: number,
  longitude: number,
): Promise<WindSnapshot | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&current=wind_speed_10m,wind_direction_10m` +
      `&hourly=wind_speed_10m,wind_direction_10m&forecast_days=2` +
      `&wind_speed_unit=ms`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Open-Meteo wind HTTP ${response.status}`);

    const payload = (await response.json()) as OpenMeteoWindResponse;
    const hourly = parseWindHourly(payload.hourly);
    const fromHourly = interpolateWindAt(hourly, Date.now());

    const speed = fromHourly?.speedMps ?? payload.current?.wind_speed_10m;
    const direction = fromHourly?.directionDeg ?? payload.current?.wind_direction_10m;
    if (typeof speed !== 'number' || !Number.isFinite(speed)) return null;
    if (typeof direction !== 'number' || !Number.isFinite(direction)) return null;

    return {
      speedMps: Math.max(0, speed),
      directionDeg: ((direction % 360) + 360) % 360,
      updatedAt: new Date().toISOString(),
      hourly,
    };
  } catch (error) {
    logCaughtError('fetchWindSnapshot', error, { level: 'warn' });
    return null;
  }
}

function parseWindHourly(
  hourly: OpenMeteoWindResponse['hourly'],
): HourlySample<WindHourlyValue>[] {
  const times = hourly?.time ?? [];
  const speeds = hourly?.wind_speed_10m ?? [];
  const dirs = hourly?.wind_direction_10m ?? [];
  const samples: HourlySample<WindHourlyValue>[] = [];

  for (let i = 0; i < times.length; i += 1) {
    const atMs = parseHourlyTimestamp(times[i] ?? '');
    const speed = speeds[i];
    const direction = dirs[i];
    if (atMs == null) continue;
    if (typeof speed !== 'number' || !Number.isFinite(speed)) continue;
    if (typeof direction !== 'number' || !Number.isFinite(direction)) continue;
    samples.push({
      atMs,
      value: {
        speedMps: Math.max(0, speed),
        directionDeg: ((direction % 360) + 360) % 360,
      },
    });
  }

  return samples;
}
