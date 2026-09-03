import type { PollenUpiIndex } from './pollen-upi';

/** Geo-linked plume particle (WGS84). */
export interface GeoPlumeParticle {
  id: number;
  latitude: number;
  longitude: number;
  ageMs: number;
  lifeMs: number;
  radiusM: number;
  opacity: number;
}

export interface GeoPlumeAdvanceParams {
  particles: GeoPlumeParticle[];
  dtMs: number;
  originLatitude: number;
  originLongitude: number;
  /** Meteorological wind direction: degrees the wind blows FROM (0 = north). */
  windFromDeg: number;
  windSpeedMps: number;
  upiIndex: PollenUpiIndex;
  nowMs?: number;
  nextId?: number;
}

export interface GeoPlumeAdvanceResult {
  particles: GeoPlumeParticle[];
  nextId: number;
}

export interface GeoPlumePolylinePoint {
  latitude: number;
  longitude: number;
}

const MAX_PARTICLES = 24;
const MIN_LIFE_MS = 2200;
const MAX_LIFE_MS = 5200;
const MAX_RANGE_M = 9000;
/** Visual exaggeration so city-zoom motion is readable. */
const VISUAL_SPEED_SCALE = 55;
const METERS_PER_DEG_LAT = 111_320;

/**
 * Downwind bearing (degrees, 0 = north, clockwise) from meteorological "from" direction.
 */
export function windToDownwindDeg(windFromDeg: number): number {
  return (windFromDeg + 180) % 360;
}

export function plumeParticleBudget(upiIndex: PollenUpiIndex): number {
  if (upiIndex <= 0) return 0;
  if (upiIndex <= 2) return 8;
  if (upiIndex === 3) return 14;
  return MAX_PARTICLES;
}

/** Displace a WGS84 point by bearing (deg) and distance (m). */
export function displaceLatLng(
  latitude: number,
  longitude: number,
  bearingDeg: number,
  distanceM: number,
): GeoPlumePolylinePoint {
  const rad = (bearingDeg * Math.PI) / 180;
  const dLat = (distanceM * Math.cos(rad)) / METERS_PER_DEG_LAT;
  const cosLat = Math.max(0.2, Math.cos((latitude * Math.PI) / 180));
  const dLon = (distanceM * Math.sin(rad)) / (METERS_PER_DEG_LAT * cosLat);
  return {
    latitude: latitude + dLat,
    longitude: longitude + dLon,
  };
}

export function distanceMeters(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const dLat = (bLat - aLat) * METERS_PER_DEG_LAT;
  const cosLat = Math.max(0.2, Math.cos((aLat * Math.PI) / 180));
  const dLon = (bLon - aLon) * METERS_PER_DEG_LAT * cosLat;
  return Math.hypot(dLat, dLon);
}

/**
 * Static downwind streak for reduceMotion / caption context.
 */
export function buildPlumeStreakPath(
  originLatitude: number,
  originLongitude: number,
  windFromDeg: number,
  upiIndex: PollenUpiIndex,
  segments = 4,
): GeoPlumePolylinePoint[] {
  if (upiIndex <= 0) return [];
  const downwind = windToDownwindDeg(windFromDeg);
  const lengthM = 2500 + upiIndex * 900;
  const path: GeoPlumePolylinePoint[] = [
    { latitude: originLatitude, longitude: originLongitude },
  ];
  for (let i = 1; i <= segments; i += 1) {
    path.push(
      displaceLatLng(
        originLatitude,
        originLongitude,
        downwind,
        (lengthM * i) / segments,
      ),
    );
  }
  return path;
}

/**
 * Advances / respawns geo-linked plume particles along the downwind vector.
 */
export function advanceGeoPlumeParticles(
  params: GeoPlumeAdvanceParams,
): GeoPlumeAdvanceResult {
  const {
    dtMs,
    originLatitude,
    originLongitude,
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
  const speedMps = Math.min(12, Math.max(0.4, windSpeedMps)) * VISUAL_SPEED_SCALE;
  const stepM = speedMps * (dtMs / 1000);

  let particles = params.particles
    .map((particle) => {
      const ageMs = particle.ageMs + dtMs;
      const moved = displaceLatLng(
        particle.latitude,
        particle.longitude,
        downwind,
        stepM,
      );
      const lifeRatio = ageMs / particle.lifeMs;
      return {
        ...particle,
        ...moved,
        ageMs,
        opacity: Math.max(0, (1 - lifeRatio) * (0.22 + upiIndex * 0.12)),
      };
    })
    .filter(
      (particle) =>
        particle.ageMs < particle.lifeMs &&
        distanceMeters(
          originLatitude,
          originLongitude,
          particle.latitude,
          particle.longitude,
        ) < MAX_RANGE_M,
    );

  while (particles.length < budget) {
    particles = [
      ...particles,
      spawnGeoParticle(
        nextId,
        upiIndex,
        originLatitude,
        originLongitude,
        downwind,
        nowMs + nextId,
      ),
    ];
    nextId += 1;
  }

  if (particles.length > budget) {
    particles = particles.slice(0, budget);
  }

  return { particles, nextId };
}

/**
 * Interpolate UPI between two daily indexes by local hour fraction (0–1 over the day).
 * Used for near-real-time display between Google daily forecast points.
 */
export function interpolateUpiIndex(
  start: PollenUpiIndex,
  end: PollenUpiIndex,
  dayFraction: number,
): PollenUpiIndex {
  const t = Math.min(1, Math.max(0, dayFraction));
  const mixed = start + (end - start) * t;
  const rounded = Math.round(mixed);
  if (rounded <= 0) return 0;
  if (rounded >= 5) return 5;
  return rounded as PollenUpiIndex;
}

/** Local day fraction from a Date (0 at midnight → 1 at next midnight). */
export function localDayFraction(date: Date = new Date()): number {
  const ms =
    date.getHours() * 3600_000 +
    date.getMinutes() * 60_000 +
    date.getSeconds() * 1000 +
    date.getMilliseconds();
  return ms / 86_400_000;
}

function spawnGeoParticle(
  id: number,
  upiIndex: PollenUpiIndex,
  originLatitude: number,
  originLongitude: number,
  downwindDeg: number,
  seed: number,
): GeoPlumeParticle {
  const lateral = (pseudoRandom(seed, 1) - 0.5) * 1200;
  const along = pseudoRandom(seed, 2) * 400;
  const base = displaceLatLng(originLatitude, originLongitude, downwindDeg, along);
  const lateralBearing = (downwindDeg + 90) % 360;
  const point = displaceLatLng(base.latitude, base.longitude, lateralBearing, lateral);
  const lifeMs = MIN_LIFE_MS + pseudoRandom(seed, 3) * (MAX_LIFE_MS - MIN_LIFE_MS);
  return {
    id,
    latitude: point.latitude,
    longitude: point.longitude,
    ageMs: 0,
    lifeMs,
    radiusM: 90 + upiIndex * 35 + pseudoRandom(seed, 4) * 40,
    opacity: 0.2 + upiIndex * 0.1,
  };
}

function pseudoRandom(seed: number, salt: number): number {
  const value = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}
