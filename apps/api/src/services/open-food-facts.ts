import { mapExternalAllergenNames } from '@allerguide/core';

export interface NormalizedProduct {
  barcode: string;
  name: string;
  ingredients: string;
  allergenTags: string[];
}

interface OffResponse {
  status?: number;
  product?: {
    product_name?: string;
    ingredients_text?: string;
    ingredients_text_ru?: string;
    code?: string;
    allergens_tags?: string[];
  };
}

/**
 * Server-side Open Food Facts lookup. Normalizes the result and maps OFF
 * `allergens_tags` (e.g. "en:milk") to the canonical RU allergen taxonomy.
 * Returns null on miss/error so callers can 404.
 */
export async function fetchOpenFoodFactsProduct(
  barcode: string,
): Promise<NormalizedProduct | null> {
  const normalized = barcode.replace(/\D/g, '');
  if (!normalized) return null;

  const baseUrl = process.env.OPENFOODFACTS_BASE_URL || 'https://world.openfoodfacts.org';

  try {
    const response = await fetch(
      `${baseUrl}/api/v2/product/${normalized}.json?fields=product_name,ingredients_text,ingredients_text_ru,code,allergens_tags`,
    );
    if (!response.ok) return null;

    const data = (await response.json()) as OffResponse;
    if (data.status !== 1 || !data.product) return null;

    const ingredients =
      data.product.ingredients_text_ru?.trim() || data.product.ingredients_text?.trim() || '';

    if (!ingredients && !data.product.product_name) return null;

    return {
      barcode: data.product.code || normalized,
      name: data.product.product_name?.trim() || `Продукт ${normalized}`,
      ingredients,
      allergenTags: mapExternalAllergenNames(data.product.allergens_tags ?? []),
    };
  } catch {
    return null;
  }
}
