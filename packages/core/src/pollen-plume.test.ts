import { describe, expect, it } from 'vitest';
import {
  advanceGeoPlumeParticles,
  buildPlumeStreakPath,
  displaceLatLng,
  interpolateUpiIndex,
  localDayFraction,
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
    expect(plumeParticleBudget(2)).toBe(8);
    expect(plumeParticleBudget(5)).toBe(24);
  });

  it('displaces east for bearing 90', () => {
    const moved = displaceLatLng(55.75, 37.62, 90, 1000);
    expect(moved.longitude).toBeGreaterThan(37.62);
    expect(Math.abs(moved.latitude - 55.75)).toBeLessThan(0.001);
  });

  it('drifts particles downwind (west wind → east)', () => {
    const origin = { lat: 55.75, lon: 37.62 };
    const first = advanceGeoPlumeParticles({
      particles: [],
      dtMs: 16,
      originLatitude: origin.lat,
      originLongitude: origin.lon,
      windFromDeg: 270,
      windSpeedMps: 6,
      upiIndex: 4,
      nowMs: 1000,
    });
    expect(first.particles.length).toBeGreaterThan(0);

    const second = advanceGeoPlumeParticles({
      particles: first.particles,
      dtMs: 800,
      originLatitude: origin.lat,
      originLongitude: origin.lon,
      windFromDeg: 270,
      windSpeedMps: 6,
      upiIndex: 4,
      nowMs: 1800,
      nextId: first.nextId,
    });

    const moved = second.particles.find((particle) =>
      first.particles.some((start) => start.id === particle.id),
    );
    expect(moved).toBeTruthy();
    const start = first.particles.find((particle) => particle.id === moved!.id)!;
    expect(moved!.longitude).toBeGreaterThan(start.longitude);
  });

  it('builds a downwind streak path', () => {
    const path = buildPlumeStreakPath(55.75, 37.62, 270, 4, 3);
    expect(path.length).toBe(4);
    expect(path[path.length - 1]!.longitude).toBeGreaterThan(37.62);
  });

  it('interpolates UPI across the day', () => {
    expect(interpolateUpiIndex(2, 4, 0)).toBe(2);
    expect(interpolateUpiIndex(2, 4, 1)).toBe(4);
    expect(interpolateUpiIndex(2, 4, 0.5)).toBe(3);
    expect(localDayFraction(new Date(2026, 7, 4, 12, 0, 0))).toBeCloseTo(0.5, 1);
  });
});
