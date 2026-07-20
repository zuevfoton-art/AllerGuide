import { mapExternalAllergenIds } from '@allerguide/core';
import { logCaughtError } from '@/src/services/error-reporting';

export interface OpenFoodFactsProduct {
  name: string;
  ingredients: string;
  barcode: string;
  allergenTags: string[];
  traceTags: string[];
}

const PRODUCT_FIELDS =
  'code,product_name,ingredients_text,ingredients_text_ru,allergens_tags,traces_tags';

export async function fetchProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const normalized = barcode.replace(/\D/g, '');
  if (!normalized) return null;

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${normalized}.json?fields=${PRODUCT_FIELDS}`,
    );

    if (!response.ok) return null;

    const data = (await response.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        ingredients_text?: string;
        ingredients_text_ru?: string;
        code?: string;
        allergens_tags?: string[];
        traces_tags?: string[];
      };
    };

    if (data.status !== 1 || !data.product) return null;

    const ingredients =
      data.product.ingredients_text_ru?.trim() ||
      data.product.ingredients_text?.trim() ||
      '';

    if (!ingredients && !data.product.product_name) return null;

    return {
      name: data.product.product_name?.trim() || `Продукт ${normalized}`,
      ingredients: ingredients || data.product.product_name || '',
      barcode: data.product.code || normalized,
      allergenTags: mapExternalAllergenIds(data.product.allergens_tags ?? []),
      traceTags: mapExternalAllergenIds(data.product.traces_tags ?? []),
    };
  } catch (error) {
    logCaughtError('fetchProductByBarcode', error, { extra: { barcode: normalized } });
    return null;
  }
}
