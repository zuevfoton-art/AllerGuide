import {
  normalizePlaceAutocompleteSuggestion,
  type PlaceAutocompleteSuggestion,
} from '@allerguide/core';
import {
  DEFAULT_PLACES_RADIUS_M,
  PLACES_AUTOCOMPLETE_FIELD_MASK,
  fetchGooglePlacesJson,
  includedPrimaryTypesForAutocomplete,
  placesAuthHeaders,
  type GooglePlacesCategory,
} from './google-places-shared';

const GOOGLE_PLACES_AUTOCOMPLETE_URL =
  'https://places.googleapis.com/v1/places:autocomplete';

export function buildGooglePlacesAutocompleteRequest(input: {
  query: string;
  latitude: number;
  longitude: number;
  languageCode: string;
  sessionToken?: string;
  categories: readonly GooglePlacesCategory[];
}): { url: string; headers: Record<string, string>; body: string } {
  const includedPrimaryTypes = includedPrimaryTypesForAutocomplete(input.categories);
  return {
    url: GOOGLE_PLACES_AUTOCOMPLETE_URL,
    headers: placesAuthHeaders(PLACES_AUTOCOMPLETE_FIELD_MASK),
    body: JSON.stringify({
      input: input.query,
      languageCode: input.languageCode,
      ...(includedPrimaryTypes ? { includedPrimaryTypes } : {}),
      ...(input.sessionToken ? { sessionToken: input.sessionToken } : {}),
      locationBias: {
        circle: {
          center: { latitude: input.latitude, longitude: input.longitude },
          radius: DEFAULT_PLACES_RADIUS_M,
        },
      },
    }),
  };
}

export async function fetchGooglePlacesAutocomplete(input: {
  query: string;
  latitude: number;
  longitude: number;
  languageCode: string;
  sessionToken?: string;
  categories: readonly GooglePlacesCategory[];
}): Promise<PlaceAutocompleteSuggestion[]> {
  const { url, headers, body } = buildGooglePlacesAutocompleteRequest(input);
  const result = await fetchGooglePlacesJson(url, { method: 'POST', headers, body });
  if (!result.ok) {
    throw new Error(`Google Places Autocomplete HTTP ${result.status}`);
  }

  const payload = result.payload as GoogleAutocompletePayload;
  return (payload.suggestions ?? [])
    .map((suggestion) =>
      normalizePlaceAutocompleteSuggestion({
        placeId: suggestion.placePrediction?.placeId,
        primaryText:
          suggestion.placePrediction?.structuredFormat?.mainText?.text ??
          suggestion.placePrediction?.text?.text,
        secondaryText: suggestion.placePrediction?.structuredFormat?.secondaryText?.text,
        distanceMeters: suggestion.placePrediction?.distanceMeters,
      }),
    )
    .filter((item): item is PlaceAutocompleteSuggestion => item !== null);
}

interface GoogleAutocompletePayload {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
      distanceMeters?: number;
    };
  }>;
}
