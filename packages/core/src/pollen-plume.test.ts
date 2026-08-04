import { describe, expect, it } from 'vitest';
import {
  advancePlumeParticles,
  plumeParticleBudget,
  windToDownwindDeg,
} from './pollen-plume';

describe('pollen-plume', () => {
  it('converts meteorological from-direction to downwind bearing', () => {
    expect(windToDownwindDeg(0)).toBe(180);
    expect(windToDownwindDeg(90)).toBe(270);
    expect(windToDownwindDeg(270)).toBe(90);
  });

  it('scales particle budget by UPI', () => {
    expect(plumeParticleBudget(0)).toBe(0);
    expect(plumeParticleBudget(2)).toBe(10);
    expect(plumeParticleBudget(5)).toBe(28);
  });

  it('spawns particles and drifts them downwind (west wind → east drift)', () => {
    const first = advancePlumeParticles({
      particles: [],
      dtMs: 16,
      windFromDeg: 270,
      windSpeedMps: 6,
      upiIndex: 4,
      nowMs: 1000,
    });
    expect(first.particles.length).toBeGreaterThan(0);

    const second = advancePlumeParticles({
      particles: first.particles,
      dtMs: 500,
      windFromDeg: 270,
      windSpeedMps: 6,
      upiIndex: 4,
      nowMs: 1500,
      nextId: first.nextId,
    });

    const moved = second.particles.find((particle) =>
      first.particles.some((start) => start.id === particle.id),
    );
    expect(moved).toBeTruthy();
    const start = first.particles.find((particle) => particle.id === moved!.id)!;
    expect(moved!.x).toBeGreaterThan(start.x);
  });

  it('clears particles when UPI is none', () => {
    const result = advancePlumeParticles({
      particles: [{ id: 1, x: 0.5, y: 0.5, ageMs: 0, lifeMs: 2000, size: 6, opacity: 0.4 }],
      dtMs: 16,
      windFromDeg: 0,
      windSpeedMps: 3,
      upiIndex: 0,
    });
    expect(result.particles).toEqual([]);
  });
});
