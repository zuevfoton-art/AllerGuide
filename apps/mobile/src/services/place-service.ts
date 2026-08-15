import {
  ADAIR_CLINICS,
  adairClinicsAsMapPois,
  catalogPlaceToMapPoi,
  CATALOG_PLACES,
  filterMapPoisByCategory,
  filterPlacesForProfile,
  isOriginInCatalogRegion,
  parseProfileAllergens,
  sortPlacesByDistance,
  type CatalogPlace,
  type MapPoi,
  type MapPoiCategory,
  type MapPoiDetails,
  type PlaceAutocompleteSuggestion,
  type Profile,
} from '@allerguide/core';
import { apiRequest } from '@/src/services/api-client';
import { MAP_PLACES_ENABLED } from '@/src/constants/features';
import { getLocale } from '@/src/services/settings-service';
import { logCaughtError } from '@/src/services/error-reporting';

export type PlaceWithDistance = CatalogPlace & { distanceKm?: number };
export type MapPoiWithDistance = MapPoi & { distanceKm?: number };
export type PlacesResultSource = 'google-places' | 'catalog' | 'adair' | 'empty';

export interface MapPlacesResult {
  pois: MapPoiWithDistance[];
  source: PlacesResultSource;
  liveEmpty: boolean;
}

function languageCode(): string {
  return getLocale() ?? 'ru';
}

function categoriesQuery(categories: readonly MapPoiCategory[]): string {
  return categories.join(',');
}

async function fetchLiveNearby(
  origin: { latitude: number; longitude: number },
  categories: readonly MapPoiCategory[],
): Promise<MapPoi[] | 'disabled' | 'empty' | 'error'> {
  if (!MAP_PLACES_ENABLED) return 'disabled';

  try {
    const response = await apiRequest<{ places?: MapPoi[] }>(
      `/api/places/nearby?lat=${origin.latitude}&lon=${origin.longitude}` +
        `&categories=${categoriesQuery(categories)}&lang=${languageCode()}`,
    );
    if (!response.ok) return 'error';
    if (!Array.isArray(response.data.places)) return 'error';
    return response.data.places.length > 0 ? response.data.places : 'empty';
  } catch (error) {
    logCaughtError('fetchLiveNearby', error, { level: 'warn' });
    return 'error';
  }
}

export async function searchLiveMapPlaces(
  origin: { latitude: number; longitude: number },
  query: string,
  categories: readonly MapPoiCategory[],
): Promise<MapPoi[] | 'disabled' | 'empty' | 'error'> {
  if (!MAP_PLACES_ENABLED) return 'disabled';

  try {
    const response = await apiRequest<{ places?: MapPoi[] }>(
      `/api/places/search?q=${encodeURIComponent(query)}&lat=${origin.latitude}` +
        `&lon=${origin.longitude}&categories=${categoriesQuery(categories)}&lang=${languageCode()}`,
    );
    if (!response.ok) return 'error';
    if (!Array.isArray(response.data.places)) return 'error';
    return response.data.places.length > 0 ? response.data.places : 'empty';
  } catch (error) {
    logCaughtError('searchLiveMapPlaces', error, { level: 'warn' });
    return 'error';
  }
}

export async function autocompleteMapPlaces(
  origin: { latitude: number; longitude: number },
  query: string,
  categories: readonly MapPoiCategory[],
  sessionToken: string,
): Promise<PlaceAutocompleteSuggestion[]> {
  if (!MAP_PLACES_ENABLED || query.trim().length < 2) return [];

  try {
    const response = await apiRequest<{ suggestions?: PlaceAutocompleteSuggestion[] }>(
      `/api/places/autocomplete?q=${encodeURIComponent(query)}&lat=${origin.latitude}` +
        `&lon=${origin.longitude}&categories=${categoriesQuery(categories)}` +
        `&sessionToken=${encodeURIComponent(sessionToken)}&lang=${languageCode()}`,
    );
    if (!response.ok || !Array.isArray(response.data.suggestions)) return [];
    return response.data.suggestions;
  } catch (error) {
    logCaughtError('autocompleteMapPlaces', error, { level: 'warn' });
    return [];
  }
}

export async function fetchMapPlaceDetails(
  placeId: string,
  sessionToken?: string,
): Promise<MapPoiDetails | null> {
  if (!MAP_PLACES_ENABLED) return null;

  try {
    const token = sessionToken ? `&sessionToken=${encodeURIComponent(sessionToken)}` : '';
    const response = await apiRequest<{ place?: MapPoiDetails }>(
      `/api/places/${encodeURIComponent(placeId)}?lang=${languageCode()}${token}`,
    );
    if (!response.ok || !response.data.place) return null;
    return response.data.place;
  } catch (error) {
    logCaughtError('fetchMapPlaceDetails', error, { level: 'warn' });
    return null;
  }
}

function catalogAsPois(profile?: Profile | null): MapPoi[] {
  const allergens = profile ? parseProfileAllergens(profile.allergies) : [];
  return filterPlacesForProfile(CATALOG_PLACES, allergens).map(catalogPlaceToMapPoi);
}

function attachDistances(
  pois: MapPoi[],
  origin: { latitude: number; longitude: number },
): MapPoiWithDistance[] {
  const asPlaces = pois.map((poi) => ({
    id: poi.id,
    title: poi.title,
    note: poi.note,
    level: poi.level,
    icon: poi.icon,
    lat: poi.lat,
    lng: poi.lng,
    tags: poi.tags,
  }));
  const sorted = sortPlacesByDistance(asPlaces, origin);
  const byId = new Map(pois.map((poi) => [poi.id, poi]));
  return sorted.flatMap((place) => {
    const poi = byId.get(place.id);
    if (!poi) return [];
    return [{ ...poi, distanceKm: place.distanceKm }];
  });
}

function nearbyAdair(origin: { latitude: number; longitude: number }): MapPoi[] {
  return adairClinicsAsMapPois(ADAIR_CLINICS).filter((clinic) =>
    isOriginInCatalogRegion(origin.latitude, origin.longitude, 120),
  );
}

function fallbackPois(
  profile: Profile | null | undefined,
  origin: { latitude: number; longitude: number },
): { pois: MapPoi[]; source: PlacesResultSource } {
  if (isOriginInCatalogRegion(origin.latitude, origin.longitude)) {
    return { pois: [...catalogAsPois(profile), ...nearbyAdair(origin)], source: 'catalog' };
  }
  const adair = nearbyAdair(origin);
  return { pois: adair, source: adair.length > 0 ? 'adair' : 'empty' };
}

export async function searchMapPlaces(
  profile: Profile | null | undefined,
  origin: { latitude: number; longitude: number },
  categories: readonly MapPoiCategory[],
  query?: string,
): Promise<MapPlacesResult> {
  const trimmed = query?.trim() ?? '';
  const live =
    trimmed.length >= 2
      ? await searchLiveMapPlaces(origin, trimmed, categories)
      : await fetchLiveNearby(origin, categories);

  if (Array.isArray(live)) {
    return {
      pois: attachDistances(filterMapPoisByCategory(live, categories), origin),
      source: 'google-places',
      liveEmpty: false,
    };
  }

  if (live === 'empty') {
    return { pois: [], source: 'empty', liveEmpty: true };
  }

  if (live === 'disabled' || live === 'error') {
    const fallback = fallbackPois(profile, origin);
    return {
      pois: attachDistances(filterMapPoisByCategory(fallback.pois, categories), origin),
      source: fallback.source,
      liveEmpty: false,
    };
  }

  return { pois: [], source: 'empty', liveEmpty: false };
}

/**
 * Unified POI list for the map tab: live Google Places when enabled,
 * otherwise a region-limited curated catalog / ADAIR fallback.
 */
export async function getMapPois(
  profile?: Profile | null,
  origin?: { latitude: number; longitude: number } | null,
  categories: readonly MapPoiCategory[] = ['restaurant', 'cafe', 'medical', 'pharmacy'],
): Promise<MapPoiWithDistance[]> {
  if (!origin) {
    return filterMapPoisByCategory(
      [...catalogAsPois(profile), ...adairClinicsAsMapPois(ADAIR_CLINICS)],
      categories,
    );
  }
  const result = await searchMapPlaces(profile, origin, categories);
  return result.pois;
}

/** Backward-compatible catalog places helper used by older callers. */
export function getRecommendedPlaces(
  profile?: Profile | null,
  origin?: { latitude: number; longitude: number } | null,
): PlaceWithDistance[] {
  const allergens = profile ? parseProfileAllergens(profile.allergies) : [];
  const filtered = filterPlacesForProfile(CATALOG_PLACES, allergens);
  if (!origin) return filtered;
  return sortPlacesByDistance(filtered, origin);
}

export async function getRecommendedPlacesAsync(
  profile?: Profile | null,
  origin?: { latitude: number; longitude: number } | null,
): Promise<PlaceWithDistance[]> {
  const pois = await getMapPois(profile, origin, ['restaurant', 'cafe', 'pharmacy']);
  return pois.map((poi) => ({
    id: poi.id,
    title: poi.title,
    note: poi.note,
    level: poi.level,
    icon: poi.icon,
    lat: poi.lat,
    lng: poi.lng,
    tags: poi.tags,
    distanceKm: poi.distanceKm,
  }));
}

export function createPlacesSessionToken(): string {
  return `ps-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
