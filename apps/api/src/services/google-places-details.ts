import { googlePlaceDetailsToMapPoi, type MapPoiDetails } from '@allerguide/core';
import {
  PLACES_DETAILS_FIELD_MASK,
  fetchGooglePlacesJson,
  placesAuthHeaders,
} from './google-places-shared';

const GOOGLE_PLACES_DETAILS_URL = 'https://places.googleapis.com/v1/places';

export function buildGooglePlacesDetailsRequest(input: {
  placeId: string;
  languageCode: string;
  sessionToken?: string;
}): { url: string; headers: Record<string, string> } {
  const params = new URLSearchParams({ languageCode: input.languageCode });
  if (input.sessionToken) params.set('sessionToken', input.sessionToken);
  return {
    url: `${GOOGLE_PLACES_DETAILS_URL}/${encodeURIComponent(input.placeId)}?${params.toString()}`,
    headers: placesAuthHeaders(PLACES_DETAILS_FIELD_MASK),
  };
}

export async function fetchGooglePlacesDetails(input: {
  placeId: string;
  languageCode: string;
  sessionToken?: string;
}): Promise<MapPoiDetails | null> {
  const { url, headers } = buildGooglePlacesDetailsRequest(input);
  const result = await fetchGooglePlacesJson(url, { method: 'GET', headers });
  if (!result.ok) {
    throw new Error(`Google Places Details HTTP ${result.status}`);
  }

  const place = result.payload as GooglePlaceDetailsPayload;
  return googlePlaceDetailsToMapPoi({
    placeId: place.id ?? input.placeId,
    name: place.displayName?.text ?? '',
    vicinity: place.formattedAddress,
    lat: place.location?.latitude ?? Number.NaN,
    lng: place.location?.longitude ?? Number.NaN,
    types: place.types,
    rating: place.rating,
    phone: place.nationalPhoneNumber,
    websiteUri: place.websiteUri,
    googleMapsUri: place.googleMapsUri,
    openingHours: place.regularOpeningHours?.weekdayDescriptions?.join(' · '),
  });
}

interface GooglePlaceDetailsPayload {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  types?: string[];
  location?: { latitude?: number; longitude?: number };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
}
