import { mapExternalAllergenIds } from '@allerguide/core';

export interface NormalizedProduct {
  barcode: string;
  name: string;
  brand: string;
  imageUrl: string;
  ingredients: string;
  allergenTags: string[];
  traceTags: string[];
}

interface OffProduct {
  product_name?: string;
  product_name_ru?: string;
  brands?: string;
  code?: string;
  ingredients_text?: string;
  ingredients_text_ru?: string;
  allergens_tags?: string[];
  traces_tags?: string[];
  image_small_url?: string;
  image_url?: string;
}

const PRODUCT_FIELDS =
  'code,product_name,product_name_ru,brands,ingredients_text,ingredients_text_ru,allergens_tags,traces_tags,image_small_url,image_url';

function baseUrl(): string {
  return process.env.OPENFOODFACTS_BASE_URL || 'https://world.openfoodfacts.org';
}

/**
 * Open Food Facts requires a descriptive User-Agent identifying the app and a
 * contact. See https://openfoodfacts.github.io/openfoodfacts-server/api/
 */
function userAgent(): string {
  return process.env.OPENFOODFACTS_USER_AGENT || 'A-Claro/1.0 (support@aclearo.com)';
}

function headers(): Record<string, string> {
  return { 'User-Agent': userAgent(), Accept: 'application/json' };
}

function normalize(product: OffProduct, fallbackBarcode = ''): NormalizedProduct | null {
  const ingredients =
    product.ingredients_text_ru?.trim() || product.ingredients_text?.trim() || '';
  const name = product.product_name_ru?.trim() || product.product_name?.trim() || '';
  const barcode = product.code?.trim() || fallbackBarcode;

  if (!barcode || (!name && !ingredients)) return null;

  // Declared allergens and "may contain" traces are kept separate (D.4).
  const allergenTags = mapExternalAllergenIds(product.allergens_tags ?? []);
  const traceTags = mapExternalAllergenIds(product.traces_tags ?? []);

  return {
    barcode,
    name: name || `Продукт ${barcode}`,
    brand: product.brands?.split(',')[0]?.trim() ?? '',
    imageUrl: product.image_small_url?.trim() || product.image_url?.trim() || '',
    ingredients,
    allergenTags,
    traceTags,
  };
}

/** On-demand product lookup by barcode from the Open Food Facts API. */
export async function fetchOpenFoodFactsProduct(
  barcode: string,
): Promise<NormalizedProduct | null> {
  const normalized = barcode.replace(/\D/g, '');
  if (!normalized) return null;

  try {
    const response = await fetch(
      `${baseUrl()}/api/v2/product/${normalized}.json?fields=${PRODUCT_FIELDS}`,
      { headers: headers() },
    );
    if (!response.ok) return null;

    const data = (await response.json()) as { status?: number; product?: OffProduct };
    if (data.status !== 1 || !data.product) return null;

    return normalize(data.product, normalized);
  } catch {
    return null;
  }
}

/**
 * On-demand full-text product search from the Open Food Facts API.
 * Returns normalized products (allergen tags mapped to canonical ids).
 */
export async function searchOpenFoodFacts(
  query: string,
  pageSize = 20,
): Promise<NormalizedProduct[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const params = new URLSearchParams({
    search_terms: term,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(Math.min(Math.max(pageSize, 1), 50)),
    fields: PRODUCT_FIELDS,
  });

  try {
    const response = await fetch(`${baseUrl()}/cgi/search.pl?${params.toString()}`, {
      headers: headers(),
    });
    if (!response.ok) return [];

    const data = (await response.json()) as { products?: OffProduct[] };
    if (!Array.isArray(data.products)) return [];

    const seen = new Set<string>();
    const results: NormalizedProduct[] = [];
    for (const product of data.products) {
      const normalizedProduct = normalize(product);
      if (!normalizedProduct || seen.has(normalizedProduct.barcode)) continue;
      seen.add(normalizedProduct.barcode);
      results.push(normalizedProduct);
    }
    return results;
  } catch {
    return [];
  }
}
