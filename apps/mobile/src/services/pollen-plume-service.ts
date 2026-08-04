import {
  advancePlumeParticles,
  type PlumeParticle,
  type PollenUpiIndex,
} from '@allerguide/core';
import type { WindSnapshot } from '@/src/services/wind-service';

export type { PlumeParticle };

const DEFAULT_WIND: WindSnapshot = {
  speedMps: 2.5,
  directionDeg: 270,
  updatedAt: '',
};

/**
 * One animation tick for the map pollen plume overlay.
 * Domain math lives in `@allerguide/core`; this only applies defaults.
 */
export function tickPollenPlume(params: {
  particles: PlumeParticle[];
  nextId: number;
  dtMs: number;
  upiIndex: PollenUpiIndex;
  wind: WindSnapshot | null;
  nowMs: number;
}): { particles: PlumeParticle[]; nextId: number } {
  const wind = params.wind ?? DEFAULT_WIND;
  return advancePlumeParticles({
    particles: params.particles,
    nextId: params.nextId,
    dtMs: params.dtMs,
    windFromDeg: wind.directionDeg,
    windSpeedMps: wind.speedMps,
    upiIndex: params.upiIndex,
    nowMs: params.nowMs,
  });
}
