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
  'code,product_name,product_name_ru,ingredients_text,ingredients_text_ru,allergens_tags,traces_tags';

const OFF_USER_AGENT = 'A-Claro/1.0 (support@aclearo.com)';

function headers(): Record<string, string> {
  return { 'User-Agent': OFF_USER_AGENT, Accept: 'application/json' };
}

type OffProductPayload = {
  product_name?: string;
  product_name_ru?: string;
  ingredients_text?: string;
  ingredients_text_ru?: string;
  code?: string;
  allergens_tags?: string[];
  traces_tags?: string[];
};

function normalizeOffProduct(
  product: OffProductPayload,
  fallbackBarcode = '',
): OpenFoodFactsProduct | null {
  const ingredients =
    product.ingredients_text_ru?.trim() || product.ingredients_text?.trim() || '';
  const name = product.product_name_ru?.trim() || product.product_name?.trim() || '';
  const barcode = product.code?.trim() || fallbackBarcode;

  if (!barcode || (!name && !ingredients)) return null;

  return {
    name: name || `Продукт ${barcode}`,
    ingredients: ingredients || name,
    barcode,
    allergenTags: mapExternalAllergenIds(product.allergens_tags ?? []),
    traceTags: mapExternalAllergenIds(product.traces_tags ?? []),
  };
}

export async function fetchProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const normalized = barcode.replace(/\D/g, '');
  if (!normalized) return null;

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${normalized}.json?fields=${PRODUCT_FIELDS}`,
      { headers: headers() },
    );

    if (!response.ok) return null;

    const data = (await response.json()) as { status?: number; product?: OffProductPayload };
    if (data.status !== 1 || !data.product) return null;

    return normalizeOffProduct(data.product, normalized);
  } catch (error) {
    logCaughtError('fetchProductByBarcode', error, { extra: { barcode: normalized } });
    return null;
  }
}

/** Full-text product search against Open Food Facts (cgi/search.pl). */
export async function searchProductsByName(
  query: string,
  pageSize = 8,
): Promise<OpenFoodFactsProduct[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const params = new URLSearchParams({
    search_terms: term,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(Math.min(Math.max(pageSize, 1), 20)),
    fields: PRODUCT_FIELDS,
  });

  try {
    const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, {
      headers: headers(),
    });
    if (!response.ok) return [];

    const data = (await response.json()) as { products?: OffProductPayload[] };
    if (!Array.isArray(data.products)) return [];

    const seen = new Set<string>();
    const results: OpenFoodFactsProduct[] = [];
    for (const product of data.products) {
      const normalized = normalizeOffProduct(product);
      if (!normalized || seen.has(normalized.barcode)) continue;
      seen.add(normalized.barcode);
      results.push(normalized);
    }
    return results;
  } catch (error) {
    logCaughtError('searchProductsByName', error, { extra: { query: term } });
    return [];
  }
}
