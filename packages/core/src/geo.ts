import type { CatalogPlace } from './catalog';

const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function sortPlacesByDistance(
  places: CatalogPlace[],
  origin: { latitude: number; longitude: number },
): Array<CatalogPlace & { distanceKm: number }> {
  return places
    .map((place) => ({
      ...place,
      distanceKm: haversineDistanceKm(origin, { latitude: place.lat, longitude: place.lng }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function formatDistanceKm(distanceKm: number): string {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} м`;
  return `${distanceKm.toFixed(1)} км`;
}
