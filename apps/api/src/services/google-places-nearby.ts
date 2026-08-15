import { dedupeMapPoisByPlaceId, googlePlaceToMapPoi, type MapPoi } from '@allerguide/core';
import {
  DEFAULT_PLACES_RADIUS_M,
  INCLUDED_TYPES_BY_CATEGORY,
  MAX_PLACES_RESULTS,
  PLACES_NEARBY_FIELD_MASK,
  fetchGooglePlacesJson,
  isGooglePlacesConfigured,
  parseCoordinate,
  parsePlacesCategory,
  placesAuthHeaders,
  type GooglePlacesCategory,
} from './google-places-shared';

const GOOGLE_PLACES_SEARCH_NEARBY_URL =
  'https://places.googleapis.com/v1/places:searchNearby';

export type GooglePlacesNearbyType = GooglePlacesCategory;

export const isGooglePlacesNearbyConfigured = isGooglePlacesConfigured;
export { parseCoordinate, parsePlacesCategory as parsePlacesNearbyType };

export function buildGooglePlacesNearbyRequest(
  latitude: number,
  longitude: number,
  type: GooglePlacesNearbyType,
  radiusMeters = DEFAULT_PLACES_RADIUS_M,
  languageCode = 'ru',
): { url: string; headers: Record<string, string>; body: string } {
  return {
    url: GOOGLE_PLACES_SEARCH_NEARBY_URL,
    headers: placesAuthHeaders(PLACES_NEARBY_FIELD_MASK),
    body: JSON.stringify({
      includedTypes: INCLUDED_TYPES_BY_CATEGORY[type],
      maxResultCount: MAX_PLACES_RESULTS,
      languageCode,
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
  languageCode = 'ru',
): Promise<MapPoi[]> {
  const { url, headers, body } = buildGooglePlacesNearbyRequest(
    latitude,
    longitude,
    type,
    DEFAULT_PLACES_RADIUS_M,
    languageCode,
  );
  const result = await fetchGooglePlacesJson(url, { method: 'POST', headers, body });
  if (!result.ok) {
    throw new Error(`Google Places Nearby HTTP ${result.status}`);
  }

  const payload = result.payload as GooglePlacesSearchNearbyPayload;
  return (payload.places ?? [])
    .slice(0, MAX_PLACES_RESULTS)
    .map((place) =>
      googlePlaceToMapPoi({
        placeId: place.id ?? '',
        name: place.displayName?.text ?? '',
        vicinity: place.formattedAddress,
        lat: place.location?.latitude ?? Number.NaN,
        lng: place.location?.longitude ?? Number.NaN,
        types: place.types,
        rating: place.rating,
      }),
    )
    .filter((place): place is MapPoi => place !== null);
}

export async function fetchGooglePlacesNearbyMany(
  latitude: number,
  longitude: number,
  types: GooglePlacesNearbyType[],
  languageCode = 'ru',
): Promise<MapPoi[]> {
  const batches = await Promise.all(
    types.map((type) => fetchGooglePlacesNearby(latitude, longitude, type, languageCode)),
  );
  return dedupeMapPoisByPlaceId(batches.flat());
}

/** @deprecated Places policy forbids caching place content; kept as a no-op for tests. */
export function clearGooglePlacesNearbyCache(): void {
  // Intentionally empty — only place IDs may be stored.
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
