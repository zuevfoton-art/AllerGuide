import { dedupeMapPoisByPlaceId, googlePlaceToMapPoi, type MapPoi } from '@allerguide/core';
import {
  DEFAULT_PLACES_RADIUS_M,
  MAX_PLACES_RESULTS,
  PLACES_TEXT_SEARCH_FIELD_MASK,
  fetchGooglePlacesJson,
  includedTypesForCategories,
  placesAuthHeaders,
  type GooglePlacesCategory,
} from './google-places-shared';

const GOOGLE_PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

export function buildGooglePlacesTextSearchRequest(input: {
  query: string;
  latitude: number;
  longitude: number;
  languageCode: string;
  categories: readonly GooglePlacesCategory[];
}): { url: string; headers: Record<string, string>; body: string } {
  return {
    url: GOOGLE_PLACES_TEXT_SEARCH_URL,
    headers: placesAuthHeaders(PLACES_TEXT_SEARCH_FIELD_MASK),
    body: JSON.stringify({
      textQuery: input.query,
      languageCode: input.languageCode,
      maxResultCount: MAX_PLACES_RESULTS,
      includedType: includedTypesForCategories(input.categories)[0],
      locationBias: {
        circle: {
          center: { latitude: input.latitude, longitude: input.longitude },
          radius: DEFAULT_PLACES_RADIUS_M,
        },
      },
    }),
  };
}

export async function fetchGooglePlacesTextSearch(input: {
  query: string;
  latitude: number;
  longitude: number;
  languageCode: string;
  categories: readonly GooglePlacesCategory[];
}): Promise<MapPoi[]> {
  const { url, headers, body } = buildGooglePlacesTextSearchRequest(input);
  const result = await fetchGooglePlacesJson(url, { method: 'POST', headers, body });
  if (!result.ok) {
    throw new Error(`Google Places Text Search HTTP ${result.status}`);
  }

  const payload = result.payload as GoogleTextSearchPayload;
  return dedupeMapPoisByPlaceId(
    (payload.places ?? [])
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
      .filter((place): place is MapPoi => place !== null),
  );
}

interface GoogleTextSearchPayload {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    rating?: number;
    types?: string[];
    location?: { latitude?: number; longitude?: number };
  }>;
}
