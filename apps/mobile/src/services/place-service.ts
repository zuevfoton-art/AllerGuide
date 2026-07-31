import {
  ADAIR_CLINICS,
  adairClinicsAsMapPois,
  catalogPlaceToMapPoi,
  CATALOG_PLACES,
  filterMapPoisByCategory,
  filterPlacesForProfile,
  parseProfileAllergens,
  sortPlacesByDistance,
  type CatalogPlace,
  type MapPoi,
  type MapPoiCategory,
  type Profile,
} from '@allerguide/core';
import { apiRequest } from '@/src/services/api-client';
import { MAP_PLACES_ENABLED } from '@/src/constants/features';
import { logCaughtError } from '@/src/services/error-reporting';

export type PlaceWithDistance = CatalogPlace & { distanceKm?: number };
export type MapPoiWithDistance = MapPoi & { distanceKm?: number };

async function fetchLiveMapPois(
  origin: { latitude: number; longitude: number },
): Promise<MapPoi[] | null> {
  if (!MAP_PLACES_ENABLED) return null;

  try {
    const response = await apiRequest<{ places?: MapPoi[] }>(
      `/api/places/nearby?lat=${origin.latitude}&lon=${origin.longitude}`,
    );
    if (!response.ok || !Array.isArray(response.data.places)) return null;
    return response.data.places;
  } catch (error) {
    logCaughtError('fetchLiveMapPois', error, { level: 'warn' });
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

/**
 * Unified POI list for the map tab: live Google Places when enabled,
 * otherwise curated catalog restaurants + ADAIR clinics.
 */
export async function getMapPois(
  profile?: Profile | null,
  origin?: { latitude: number; longitude: number } | null,
  categories: readonly MapPoiCategory[] = ['restaurant', 'medical', 'pharmacy'],
): Promise<MapPoiWithDistance[]> {
  const live = origin ? await fetchLiveMapPois(origin) : null;
  const catalogPois = catalogAsPois(profile);
  const medicalFallback = adairClinicsAsMapPois(ADAIR_CLINICS);

  const merged = live && live.length > 0
    ? [
        ...live,
        ...medicalFallback.filter(
          (clinic) => !live.some((poi) => poi.source === 'adair' && poi.id === clinic.id),
        ),
      ]
    : [...catalogPois, ...medicalFallback];

  const filtered = filterMapPoisByCategory(merged, categories);
  if (!origin) return filtered;
  return attachDistances(filtered, origin);
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
  const pois = await getMapPois(profile, origin, ['restaurant', 'pharmacy']);
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
