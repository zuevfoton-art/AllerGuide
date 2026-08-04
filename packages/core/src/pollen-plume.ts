import type { PollenUpiIndex } from './pollen-upi';

/** Screen-space plume particle (normalized 0–1 coordinates). */
export interface PlumeParticle {
  id: number;
  x: number;
  y: number;
  ageMs: number;
  lifeMs: number;
  size: number;
  opacity: number;
}

export interface PlumeAdvanceParams {
  particles: PlumeParticle[];
  dtMs: number;
  /** Meteorological wind direction: degrees the wind blows FROM (0 = north). */
  windFromDeg: number;
  windSpeedMps: number;
  upiIndex: PollenUpiIndex;
  /** Wall-clock seed for deterministic spawn jitter in tests. */
  nowMs?: number;
  nextId?: number;
}

export interface PlumeAdvanceResult {
  particles: PlumeParticle[];
  nextId: number;
}

const MAX_PARTICLES = 28;
const MIN_LIFE_MS = 1800;
const MAX_LIFE_MS = 4200;
const BASE_SPEED = 0.000035;

/**
 * Downwind bearing (degrees, 0 = north, clockwise) from meteorological "from" direction.
 */
export function windToDownwindDeg(windFromDeg: number): number {
  return (windFromDeg + 180) % 360;
}

export function plumeParticleBudget(upiIndex: PollenUpiIndex): number {
  if (upiIndex <= 0) return 0;
  if (upiIndex <= 2) return 10;
  if (upiIndex === 3) return 18;
  return MAX_PARTICLES;
}

/**
 * Advances / respawns screen-space plume particles along the downwind vector.
 * Pure function — suitable for unit tests and UI requestAnimationFrame loops.
 */
export function advancePlumeParticles(params: PlumeAdvanceParams): PlumeAdvanceResult {
  const {
    dtMs,
    windFromDeg,
    windSpeedMps,
    upiIndex,
    nowMs = 0,
  } = params;
  let nextId = params.nextId ?? 1;
  const budget = plumeParticleBudget(upiIndex);
  if (budget === 0 || dtMs <= 0) {
    return { particles: [], nextId };
  }

  const downwind = windToDownwindDeg(windFromDeg);
  const radians = ((90 - downwind) * Math.PI) / 180;
  const speedFactor = Math.min(2.5, 0.35 + windSpeedMps / 8);
  const dx = Math.cos(radians) * BASE_SPEED * speedFactor * dtMs;
  const dy = -Math.sin(radians) * BASE_SPEED * speedFactor * dtMs;

  let particles = params.particles
    .map((particle) => {
      const ageMs = particle.ageMs + dtMs;
      const lifeRatio = ageMs / particle.lifeMs;
      return {
        ...particle,
        x: particle.x + dx,
        y: particle.y + dy,
        ageMs,
        opacity: Math.max(0, (1 - lifeRatio) * (0.25 + upiIndex * 0.12)),
      };
    })
    .filter(
      (particle) =>
        particle.ageMs < particle.lifeMs &&
        particle.x > -0.15 &&
        particle.x < 1.15 &&
        particle.y > -0.15 &&
        particle.y < 1.15,
    );

  while (particles.length < budget) {
    const spawn = spawnParticle(nextId, upiIndex, nowMs + nextId);
    nextId += 1;
    particles = [...particles, spawn];
  }

  if (particles.length > budget) {
    particles = particles.slice(0, budget);
  }

  return { particles, nextId };
}

function spawnParticle(id: number, upiIndex: PollenUpiIndex, seed: number): PlumeParticle {
  const jitterX = pseudoRandom(seed, 1) * 0.22 - 0.11;
  const jitterY = pseudoRandom(seed, 2) * 0.22 - 0.11;
  const lifeMs = MIN_LIFE_MS + pseudoRandom(seed, 3) * (MAX_LIFE_MS - MIN_LIFE_MS);
  return {
    id,
    x: 0.5 + jitterX,
    y: 0.5 + jitterY,
    ageMs: 0,
    lifeMs,
    size: 4 + upiIndex * 1.4 + pseudoRandom(seed, 4) * 3,
    opacity: 0.2 + upiIndex * 0.1,
  };
}

function pseudoRandom(seed: number, salt: number): number {
  const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}
