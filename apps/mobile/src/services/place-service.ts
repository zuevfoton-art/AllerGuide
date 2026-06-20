import {
  CATALOG_PLACES,
  filterPlacesForProfile,
  parseProfileAllergens,
  type CatalogPlace,
  type Profile,
} from '@allerguide/core';

export function getRecommendedPlaces(profile?: Profile | null): CatalogPlace[] {
  const allergens = profile ? parseProfileAllergens(profile.allergies) : [];
  return filterPlacesForProfile(CATALOG_PLACES, allergens);
}
