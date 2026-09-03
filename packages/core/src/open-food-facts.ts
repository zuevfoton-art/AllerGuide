import { mapExternalAllergenIds } from './allergen-aliases';

export const OFF_FAMILY_SOURCES = [
  'openfoodfacts',
  'openbeautyfacts',
  'openproductsfacts',
] as const;

export type OffFamilySource = (typeof OFF_FAMILY_SOURCES)[number];

export type OffProductCategory = 'food' | 'beauty' | 'household';

/** Open Food Facts requires a descriptive User-Agent identifying the app and a contact. */
export const OFF_DEFAULT_USER_AGENT = 'A-Claro/1.0 (support@aclearo.com)';

export const OFF_DEFAULT_BASE_URLS: Record<OffFamilySource, string> = {
  openfoodfacts: 'https://world.openfoodfacts.org',
  openbeautyfacts: 'https://world.openbeautyfacts.org',
  openproductsfacts: 'https://world.openproductsfacts.org',
};

/** Superset of fields requested by the mobile and API adapters. */
export const OFF_PRODUCT_FIELDS =
  'code,product_name,product_name_ru,brands,ingredients_text,ingredients_text_ru,allergens_tags,traces_tags,image_front_small_url,image_small_url,image_url';

export const OFF_DEFAULT_DATASETS: ReadonlyArray<{ source: OffFamilySource; url: string }> =
  OFF_FAMILY_SOURCES.map((source) => ({
    source,
    url: OFF_DEFAULT_BASE_URLS[source],
  }));

export interface OffProductPayload {
  product_name?: string;
  product_name_ru?: string;
  brands?: string;
  code?: string;
  ingredients_text?: string;
  ingredients_text_ru?: string;
  allergens_tags?: string[];
  traces_tags?: string[];
  image_front_small_url?: string;
  image_small_url?: string;
  image_url?: string;
}

export interface NormalizedOffProduct {
  barcode: string;
  name: string;
  brand: string;
  imageUrl: string;
  ingredients: string;
  allergenTags: string[];
  traceTags: string[];
  source: OffFamilySource;
  category: OffProductCategory;
}

export function categoryFromOffSource(source: OffFamilySource): OffProductCategory {
  if (source === 'openbeautyfacts') return 'beauty';
  if (source === 'openproductsfacts') return 'household';
  return 'food';
}

export function normalizeOffBarcode(barcode: string): string {
  return barcode.replace(/\D/g, '');
}

export function normalizeOffProduct(
  product: OffProductPayload,
  source: OffFamilySource,
  fallbackBarcode = '',
): NormalizedOffProduct | null {
  const ingredients =
    product.ingredients_text_ru?.trim() || product.ingredients_text?.trim() || '';
  const name = product.product_name_ru?.trim() || product.product_name?.trim() || '';
  const barcode = product.code?.trim() || fallbackBarcode;

  if (!barcode || (!name && !ingredients)) return null;

  return {
    barcode,
    name: name || `Продукт ${barcode}`,
    brand: product.brands?.split(',')[0]?.trim() ?? '',
    imageUrl:
      product.image_front_small_url?.trim() ||
      product.image_small_url?.trim() ||
      product.image_url?.trim() ||
      '',
    ingredients,
    allergenTags: mapExternalAllergenIds(product.allergens_tags ?? []),
    traceTags: mapExternalAllergenIds(product.traces_tags ?? []),
    source,
    category: categoryFromOffSource(source),
  };
}

export function buildOffProductApiUrl(
  baseUrl: string,
  barcode: string,
  fields = OFF_PRODUCT_FIELDS,
): string {
  const origin = baseUrl.replace(/\/$/, '');
  return `${origin}/api/v2/product/${barcode}.json?fields=${fields}`;
}

export function buildOffSearchParams(
  query: string,
  pageSize: number,
  options?: { maxPageSize?: number; fields?: string },
): URLSearchParams {
  const maxPageSize = options?.maxPageSize ?? 50;
  return new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(Math.min(Math.max(pageSize, 1), maxPageSize)),
    fields: options?.fields ?? OFF_PRODUCT_FIELDS,
  });
}

export function buildOffSearchUrl(
  baseUrl: string,
  query: string,
  pageSize: number,
  options?: { maxPageSize?: number; fields?: string },
): string {
  const origin = baseUrl.replace(/\/$/, '');
  return `${origin}/cgi/search.pl?${buildOffSearchParams(query, pageSize, options).toString()}`;
}
