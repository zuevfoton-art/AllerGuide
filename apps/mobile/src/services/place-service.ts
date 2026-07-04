import {
  CATALOG_PLACES,
  filterPlacesForProfile,
  parseProfileAllergens,
  sortPlacesByDistance,
  type CatalogPlace,
  type Profile,
} from '@allerguide/core';
import { apiRequest } from '@/src/services/api-client';

export type PlaceWithDistance = CatalogPlace & { distanceKm?: number };

const LIVE_PLACES_ENABLED = process.env.EXPO_PUBLIC_LIVE_MAP === 'true';

async function fetchLivePlaces(
  origin: { latitude: number; longitude: number },
): Promise<CatalogPlace[] | null> {
  if (!LIVE_PLACES_ENABLED) return null;

  const response = await apiRequest<{ places?: CatalogPlace[] }>(
    `/api/places/nearby?lat=${origin.latitude}&lon=${origin.longitude}`,
  );

  if (!response.ok || !Array.isArray(response.data.places)) return null;
  return response.data.places;
}

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
  const allergens = profile ? parseProfileAllergens(profile.allergies) : [];
  const live = origin ? await fetchLivePlaces(origin) : null;
  const base = live ?? CATALOG_PLACES;
  const filtered = filterPlacesForProfile(base, allergens);
  if (!origin) return filtered;
  return sortPlacesByDistance(filtered, origin);
}
