import {
  CATALOG_PRODUCTS,
  filterProductsForProfile,
  parseProfileAllergens,
  type CatalogProduct,
  type Profile,
} from '@allerguide/core';

export function getRecommendedProducts(profile?: Profile | null): CatalogProduct[] {
  const allergens = profile ? parseProfileAllergens(profile.allergies) : [];
  const filtered = filterProductsForProfile(CATALOG_PRODUCTS, allergens);
  return filtered.length > 0
    ? filtered
    : CATALOG_PRODUCTS.filter((product) => product.containsAllergens.length === 0);
}

export function searchRecommendedProducts(
  profile: Profile | null | undefined,
  query: string,
): CatalogProduct[] {
  const products = getRecommendedProducts(profile);
  const normalized = query.trim().toLowerCase();
  if (!normalized) return products;

  return products.filter(
    (product) =>
      product.title.toLowerCase().includes(normalized) ||
      product.why.toLowerCase().includes(normalized) ||
      product.tag.toLowerCase().includes(normalized),
  );
}
