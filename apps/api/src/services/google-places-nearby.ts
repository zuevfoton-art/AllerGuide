import { googlePlaceToMapPoi, type MapPoi } from '@allerguide/core';

const GOOGLE_PLACES_NEARBY_URL =
  'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
const PLACES_CACHE_TTL_MS = 15 * 60 * 1000;
const DEFAULT_RADIUS_M = 3000;
const MAX_RESULTS = 20;

export type GooglePlacesNearbyType = 'restaurant' | 'hospital' | 'pharmacy';

interface CacheEntry {
  expiresAt: number;
  value: MapPoi[];
}

const placesCache = new Map<string, CacheEntry>();

export function isGooglePlacesNearbyConfigured(): boolean {
  if (process.env.MAP_PLACES_ENABLED !== 'true') return false;
  return Boolean(
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
      process.env.GOOGLE_POLLEN_API_KEY?.trim() ||
      process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim(),
  );
}

function resolvePlacesApiKey(): string {
  const key =
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim() ||
    process.env.GOOGLE_POLLEN_API_KEY?.trim();
  if (!key) throw new Error('Google Places API key is not configured');
  return key;
}

export function buildGooglePlacesNearbyUrl(
  latitude: number,
  longitude: number,
  type: GooglePlacesNearbyType,
  radiusMeters = DEFAULT_RADIUS_M,
): string {
  const params = new URLSearchParams({
    location: `${latitude},${longitude}`,
    radius: String(radiusMeters),
    type,
    key: resolvePlacesApiKey(),
  });
  return `${GOOGLE_PLACES_NEARBY_URL}?${params.toString()}`;
}

export async function fetchGooglePlacesNearby(
  latitude: number,
  longitude: number,
  type: GooglePlacesNearbyType,
): Promise<MapPoi[]> {
  const cacheKey = `${type}:${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
  const cached = placesCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const response = await fetch(buildGooglePlacesNearbyUrl(latitude, longitude, type), {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Google Places Nearby HTTP ${response.status}`);
  }

  const payload = (await response.json()) as GooglePlacesNearbyPayload;
  if (payload.status && payload.status !== 'OK' && payload.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places Nearby status ${payload.status}`);
  }

  const places = (payload.results ?? [])
    .slice(0, MAX_RESULTS)
    .map((result) =>
      googlePlaceToMapPoi({
        placeId: result.place_id ?? '',
        name: result.name ?? '',
        vicinity: result.vicinity,
        lat: result.geometry?.location?.lat ?? Number.NaN,
        lng: result.geometry?.location?.lng ?? Number.NaN,
        types: result.types,
        rating: result.rating,
      }),
    )
    .filter((place): place is MapPoi => place !== null);

  placesCache.set(cacheKey, {
    expiresAt: Date.now() + PLACES_CACHE_TTL_MS,
    value: places,
  });
  return places;
}

export function clearGooglePlacesNearbyCache(): void {
  placesCache.clear();
}

interface GooglePlacesNearbyPayload {
  status?: string;
  results?: Array<{
    place_id?: string;
    name?: string;
    vicinity?: string;
    rating?: number;
    types?: string[];
    geometry?: { location?: { lat?: number; lng?: number } };
  }>;
}

export function parsePlacesNearbyType(raw: string): GooglePlacesNearbyType | null {
  if (raw === 'restaurant' || raw === 'hospital' || raw === 'pharmacy') return raw;
  return null;
}

export function parseCoordinate(raw: unknown): number | null {
  const value = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : Number.NaN;
  if (!Number.isFinite(value)) return null;
  return value;
}
