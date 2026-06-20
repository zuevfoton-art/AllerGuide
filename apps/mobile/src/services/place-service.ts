import {
  CATALOG_PLACES,
  filterPlacesForProfile,
  parseProfileAllergens,
  sortPlacesByDistance,
  type CatalogPlace,
  type Profile,
} from '@allerguide/core';

export type PlaceWithDistance = CatalogPlace & { distanceKm?: number };

export function getRecommendedPlaces(
  profile?: Profile | null,
  origin?: { latitude: number; longitude: number } | null,
): PlaceWithDistance[] {
  const allergens = profile ? parseProfileAllergens(profile.allergies) : [];
  const filtered = filterPlacesForProfile(CATALOG_PLACES, allergens);

  if (!origin) return filtered;

  return sortPlacesByDistance(filtered, origin);
}
