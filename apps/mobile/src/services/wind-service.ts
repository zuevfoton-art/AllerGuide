import { logCaughtError } from '@/src/services/error-reporting';

export interface WindSnapshot {
  /** Wind speed at 10 m (m/s). */
  speedMps: number;
  /** Meteorological direction the wind blows FROM (degrees, 0 = north). */
  directionDeg: number;
  updatedAt: string;
}

interface OpenMeteoWindResponse {
  current?: {
    wind_speed_10m?: number | null;
    wind_direction_10m?: number | null;
    time?: string;
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
      `&longitude=${longitude}&current=wind_speed_10m,wind_direction_10m` +
      `&wind_speed_unit=ms`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Open-Meteo wind HTTP ${response.status}`);

    const payload = (await response.json()) as OpenMeteoWindResponse;
    const speed = payload.current?.wind_speed_10m;
    const direction = payload.current?.wind_direction_10m;
    if (typeof speed !== 'number' || !Number.isFinite(speed)) return null;
    if (typeof direction !== 'number' || !Number.isFinite(direction)) return null;

    return {
      speedMps: Math.max(0, speed),
      directionDeg: ((direction % 360) + 360) % 360,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logCaughtError('fetchWindSnapshot', error, { level: 'warn' });
    return null;
  }
}
