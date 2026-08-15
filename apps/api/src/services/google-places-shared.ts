import type { MapPoiCategory } from '@allerguide/core';

export type GooglePlacesCategory = MapPoiCategory;

export const GOOGLE_PLACES_CATEGORIES: readonly GooglePlacesCategory[] = [
  'restaurant',
  'cafe',
  'medical',
  'pharmacy',
];

/** Places API (New) `includedTypes` / `includedPrimaryTypes` per product category. */
export const INCLUDED_TYPES_BY_CATEGORY: Record<GooglePlacesCategory, string[]> = {
  restaurant: ['restaurant'],
  cafe: ['cafe', 'coffee_shop', 'bakery'],
  medical: ['hospital', 'doctor'],
  pharmacy: ['pharmacy', 'drugstore'],
};

export const PLACES_NEARBY_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating';
export const PLACES_TEXT_SEARCH_FIELD_MASK = PLACES_NEARBY_FIELD_MASK;
export const PLACES_AUTOCOMPLETE_FIELD_MASK =
  'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.distanceMeters';
export const PLACES_DETAILS_FIELD_MASK =
  'id,displayName,formattedAddress,location,types,rating,nationalPhoneNumber,websiteUri,googleMapsUri,regularOpeningHours.weekdayDescriptions';

export const DEFAULT_PLACES_RADIUS_M = 3000;
export const MAX_PLACES_RESULTS = 20;
export const MIN_PLACES_QUERY_LENGTH = 2;
export const MAX_PLACES_QUERY_LENGTH = 80;
export const PLACES_REQUEST_TIMEOUT_MS = 8000;

export function isGooglePlacesConfigured(): boolean {
  if (process.env.MAP_PLACES_ENABLED !== 'true') return false;
  return Boolean(
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
      process.env.GOOGLE_POLLEN_API_KEY?.trim() ||
      process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim(),
  );
}

export function resolvePlacesApiKey(): string {
  const key =
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim() ||
    process.env.GOOGLE_POLLEN_API_KEY?.trim();
  if (!key) throw new Error('Google Places API key is not configured');
  return key;
}

export function placesAuthHeaders(fieldMask: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Goog-Api-Key': resolvePlacesApiKey(),
    'X-Goog-FieldMask': fieldMask,
  };
}

export function parsePlacesCategory(raw: string): GooglePlacesCategory | null {
  if (raw === 'restaurant' || raw === 'cafe' || raw === 'medical' || raw === 'pharmacy') {
    return raw;
  }
  if (raw === 'hospital') return 'medical';
  return null;
}

export function parsePlacesCategories(raw: unknown): GooglePlacesCategory[] {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return [...GOOGLE_PLACES_CATEGORIES];
  }
  const parsed = raw
    .split(',')
    .map((item) => parsePlacesCategory(item.trim()))
    .filter((item): item is GooglePlacesCategory => item !== null);
  return [...new Set(parsed)];
}

export function parseCoordinate(raw: unknown): number | null {
  const value = typeof raw === 'string' || typeof raw === 'number' ? Number(raw) : Number.NaN;
  if (!Number.isFinite(value)) return null;
  return value;
}

export function parsePlacesLanguage(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.toLowerCase() : '';
  return ['ru', 'en', 'es', 'fr', 'de', 'it'].includes(value) ? value : 'ru';
}

export function parsePlacesSessionToken(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const token = raw.trim();
  if (token.length < 8 || token.length > 128) return undefined;
  if (!/^[A-Za-z0-9._:-]+$/.test(token)) return undefined;
  return token;
}

export function parsePlacesQuery(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const query = raw.trim();
  if (query.length < MIN_PLACES_QUERY_LENGTH || query.length > MAX_PLACES_QUERY_LENGTH) {
    return null;
  }
  return query;
}

export async function fetchGooglePlacesJson(
  url: string,
  init: { method?: string; headers: Record<string, string>; body?: string },
): Promise<{ ok: true; payload: unknown } | { ok: false; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PLACES_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: init.method ?? 'POST',
      headers: init.headers,
      body: init.body,
      signal: controller.signal,
    });
    if (!response.ok) {
      return { ok: false, status: response.status };
    }
    return { ok: true, payload: await response.json() };
  } finally {
    clearTimeout(timer);
  }
}

export function includedTypesForCategories(categories: readonly GooglePlacesCategory[]): string[] {
  return [...new Set(categories.flatMap((category) => INCLUDED_TYPES_BY_CATEGORY[category]))];
}
