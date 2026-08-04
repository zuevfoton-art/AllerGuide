import {
  advanceGeoPlumeParticles,
  buildPlumeStreakPath,
  interpolateUpiIndex,
  localDayFraction,
  type GeoPlumeParticle,
  type GeoPlumePolylinePoint,
  type PollenUpiIndex,
  type PollenUpiSnapshot,
} from '@allerguide/core';
import type { WindSnapshot } from '@/src/services/wind-service';

export type { GeoPlumeParticle as PlumeParticle };

const DEFAULT_WIND: WindSnapshot = {
  speedMps: 2.5,
  directionDeg: 270,
  updatedAt: '',
};

/**
 * One animation tick for geo-linked map plume particles.
 */
export function tickPollenPlume(params: {
  particles: GeoPlumeParticle[];
  nextId: number;
  dtMs: number;
  upiIndex: PollenUpiIndex;
  originLatitude: number;
  originLongitude: number;
  wind: WindSnapshot | null;
  nowMs: number;
}): { particles: GeoPlumeParticle[]; nextId: number } {
  const wind = params.wind ?? DEFAULT_WIND;
  return advanceGeoPlumeParticles({
    particles: params.particles,
    nextId: params.nextId,
    dtMs: params.dtMs,
    originLatitude: params.originLatitude,
    originLongitude: params.originLongitude,
    windFromDeg: wind.directionDeg,
    windSpeedMps: wind.speedMps,
    upiIndex: params.upiIndex,
    nowMs: params.nowMs,
  });
}

export function plumeStreakForWind(params: {
  originLatitude: number;
  originLongitude: number;
  wind: WindSnapshot | null;
  upiIndex: PollenUpiIndex;
}): GeoPlumePolylinePoint[] {
  const wind = params.wind ?? DEFAULT_WIND;
  return buildPlumeStreakPath(
    params.originLatitude,
    params.originLongitude,
    wind.directionDeg,
    params.upiIndex,
  );
}

/** Blend today's and tomorrow's Google UPI by local time of day. */
export function interpolateMapUpi(
  today: PollenUpiSnapshot | null | undefined,
  tomorrow: PollenUpiSnapshot | null | undefined,
  now: Date = new Date(),
): PollenUpiIndex {
  const start = today?.index ?? 0;
  const end = tomorrow?.index ?? start;
  return interpolateUpiIndex(start, end, localDayFraction(now));
}
