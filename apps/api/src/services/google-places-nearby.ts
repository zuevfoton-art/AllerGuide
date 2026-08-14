import { googlePlaceToMapPoi, type MapPoi, type MapPoiCategory } from '@allerguide/core';

/**
 * Places API (New) Nearby Search. The legacy `nearbysearch` endpoint became
 * Legacy on 2025-03-01 and cannot be enabled in new Google Cloud projects.
 * @see https://developers.google.com/maps/documentation/places/web-service/nearby-search
 */
const GOOGLE_PLACES_SEARCH_NEARBY_URL =
  'https://places.googleapis.com/v1/places:searchNearby';
const PLACES_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating';
const PLACES_CACHE_TTL_MS = 15 * 60 * 1000;
const DEFAULT_RADIUS_M = 3000;
const MAX_RESULTS = 20;
const PLACES_LANGUAGE_CODE = 'ru';

export type GooglePlacesNearbyType = MapPoiCategory;

/** Places API (New) `includedTypes` per product category. */
const INCLUDED_TYPES_BY_CATEGORY: Record<GooglePlacesNearbyType, string[]> = {
  restaurant: ['restaurant'],
  cafe: ['cafe', 'coffee_shop', 'bakery'],
  medical: ['hospital', 'doctor'],
  pharmacy: ['pharmacy', 'drugstore'],
};

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

export function buildGooglePlacesNearbyRequest(
  latitude: number,
  longitude: number,
  type: GooglePlacesNearbyType,
  radiusMeters = DEFAULT_RADIUS_M,
): { url: string; headers: Record<string, string>; body: string } {
  return {
    url: GOOGLE_PLACES_SEARCH_NEARBY_URL,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Goog-Api-Key': resolvePlacesApiKey(),
      'X-Goog-FieldMask': PLACES_FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: INCLUDED_TYPES_BY_CATEGORY[type],
      maxResultCount: MAX_RESULTS,
      languageCode: PLACES_LANGUAGE_CODE,
      locationRestriction: {
        circle: {
          center: { latitude, longitude },
          radius: radiusMeters,
        },
      },
    }),
  };
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

  const { url, headers, body } = buildGooglePlacesNearbyRequest(latitude, longitude, type);
  const response = await fetch(url, { method: 'POST', headers, body });
  if (!response.ok) {
    throw new Error(`Google Places Nearby HTTP ${response.status}`);
  }

  const payload = (await response.json()) as GooglePlacesSearchNearbyPayload;
  const places = (payload.places ?? [])
    .slice(0, MAX_RESULTS)
    .map((result) =>
      googlePlaceToMapPoi({
        placeId: result.id ?? '',
        name: result.displayName?.text ?? '',
        vicinity: result.formattedAddress,
        lat: result.location?.latitude ?? Number.NaN,
        lng: result.location?.longitude ?? Number.NaN,
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

interface GooglePlacesSearchNearbyPayload {
  places?: Array<{
    id?: string;
    displayName?: { text?: string; languageCode?: string };
    formattedAddress?: string;
    rating?: number;
    types?: string[];
    location?: { latitude?: number; longitude?: number };
  }>;
}

export function parsePlacesNearbyType(raw: string): GooglePlacesNearbyType | null {
  if (raw === 'restaurant' || raw === 'cafe' || raw === 'medical' || raw === 'pharmacy') {
    return raw;
  }
  // Legacy alias kept for older clients that requested the raw Google type.
  if (raw === 'hospital') return 'medical';
  return null;
}

export function parseCoordinate(raw: unknown): number | null {
  const value = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : Number.NaN;
  if (!Number.isFinite(value)) return null;
  return value;
}
