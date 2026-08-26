import {
  ADAIR_CLINICS,
  adairCatalogAsMapPois,
  adairClinicsAsMapPois,
  catalogPlaceToMapPoi,
  CATALOG_PLACES,
  DEFAULT_PLACE_FILTERS,
  dedupeMapPoisByPlaceId,
  filterMapPoisByCategory,
  filterMapPoisByPlaceFilters,
  filterPlacesForProfile,
  isOriginInCatalogRegion,
  parseProfileAllergens,
  searchAdairClinics,
  sortPlacesByDistance,
  splitPlaceFilters,
  type CatalogPlace,
  type MapPlaceFilterId,
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
  if (categories.length === 0) return 'empty';

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
  if (categories.length === 0) return 'empty';

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
  filters: readonly MapPlaceFilterId[],
  sessionToken: string,
): Promise<PlaceAutocompleteSuggestion[]> {
  const { categories } = splitPlaceFilters(filters);
  if (!MAP_PLACES_ENABLED || query.trim().length < 2 || categories.length === 0) return [];

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

function adairOverlay(query?: string): MapPoi[] {
  const trimmed = query?.trim() ?? '';
  if (trimmed.length < 2) return adairCatalogAsMapPois();
  return adairClinicsAsMapPois(searchAdairClinics(trimmed));
}

function fallbackPois(
  profile: Profile | null | undefined,
  origin: { latitude: number; longitude: number },
): { pois: MapPoi[]; source: PlacesResultSource } {
  const catalog = isOriginInCatalogRegion(origin.latitude, origin.longitude)
    ? catalogAsPois(profile)
    : [];
  if (catalog.length > 0) return { pois: catalog, source: 'catalog' };
  return { pois: [], source: 'empty' };
}

function mergeWithAdair(
  liveOrFallback: MapPoi[],
  includeAdair: boolean,
  query?: string,
): MapPoi[] {
  const overlay = includeAdair ? adairOverlay(query) : [];
  return dedupeMapPoisByPlaceId([...overlay, ...liveOrFallback]);
}

export async function searchMapPlaces(
  profile: Profile | null | undefined,
  origin: { latitude: number; longitude: number },
  filters: readonly MapPlaceFilterId[],
  query?: string,
): Promise<MapPlacesResult> {
  const trimmed = query?.trim() ?? '';
  const { adair: includeAdair, categories } = splitPlaceFilters(filters);

  if (categories.length === 0) {
    const overlay = includeAdair ? adairOverlay(trimmed) : [];
    return {
      pois: attachDistances(overlay, origin),
      source: overlay.length > 0 ? 'adair' : 'empty',
      liveEmpty: false,
    };
  }

  const live =
    trimmed.length >= 2
      ? await searchLiveMapPlaces(origin, trimmed, categories)
      : await fetchLiveNearby(origin, categories);

  if (Array.isArray(live)) {
    const merged = mergeWithAdair(
      filterMapPoisByCategory(live, categories),
      includeAdair,
      trimmed,
    );
    return {
      pois: attachDistances(merged, origin),
      source: 'google-places',
      liveEmpty: false,
    };
  }

  if (live === 'empty') {
    const overlay = includeAdair ? adairOverlay(trimmed) : [];
    return {
      pois: attachDistances(overlay, origin),
      source: overlay.length > 0 ? 'adair' : 'empty',
      liveEmpty: overlay.length === 0,
    };
  }

  if (live === 'disabled' || live === 'error') {
    const fallback = fallbackPois(profile, origin);
    const merged = mergeWithAdair(
      filterMapPoisByCategory(fallback.pois, categories),
      includeAdair,
      trimmed,
    );
    return {
      pois: attachDistances(merged, origin),
      source: merged.some((poi) => poi.source === 'catalog')
        ? fallback.source
        : merged.length > 0
          ? 'adair'
          : fallback.source,
      liveEmpty: false,
    };
  }

  return { pois: [], source: 'empty', liveEmpty: false };
}

/**
 * Unified POI list for the map tab: live Google Places when enabled,
 * plus a bundled ADAIR overlay when that filter is on.
 */
export async function getMapPois(
  profile?: Profile | null,
  origin?: { latitude: number; longitude: number } | null,
  filters: readonly MapPlaceFilterId[] = DEFAULT_PLACE_FILTERS,
): Promise<MapPoiWithDistance[]> {
  if (!origin) {
    return filterMapPoisByPlaceFilters(
      [...catalogAsPois(profile), ...adairClinicsAsMapPois(ADAIR_CLINICS)],
      filters,
    );
  }
  const result = await searchMapPlaces(profile, origin, filters);
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
