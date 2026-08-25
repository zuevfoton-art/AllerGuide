import { mapExternalAllergenIds } from '@allerguide/core';
import { logCaughtError } from '@/src/services/error-reporting';

export type OffFamilySource = 'openfoodfacts' | 'openbeautyfacts' | 'openproductsfacts';

export interface OpenFoodFactsProduct {
  name: string;
  ingredients: string;
  barcode: string;
  brand?: string;
  imageUrl?: string;
  allergenTags: string[];
  traceTags: string[];
  source: OffFamilySource;
}

const PRODUCT_FIELDS =
  'code,product_name,product_name_ru,ingredients_text,ingredients_text_ru,allergens_tags,traces_tags,brands,image_front_small_url';

const OFF_USER_AGENT = 'A-Claro/1.0 (support@aclearo.com)';
const OFF_SEARCH_TIMEOUT_MS = 4000;

const OFF_FAMILY_DATASETS: { source: OffFamilySource; url: string }[] = [
  { source: 'openfoodfacts', url: 'https://world.openfoodfacts.org' },
  { source: 'openbeautyfacts', url: 'https://world.openbeautyfacts.org' },
  { source: 'openproductsfacts', url: 'https://world.openproductsfacts.org' },
];

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
  brands?: string;
  image_front_small_url?: string;
};

function normalizeOffProduct(
  product: OffProductPayload,
  source: OffFamilySource,
  fallbackBarcode = '',
): OpenFoodFactsProduct | null {
  const ingredients =
    product.ingredients_text_ru?.trim() || product.ingredients_text?.trim() || '';
  const name = product.product_name_ru?.trim() || product.product_name?.trim() || '';
  const barcode = product.code?.trim() || fallbackBarcode;

  if (!barcode || (!name && !ingredients)) return null;

  const brand = product.brands?.split(',')[0]?.trim() || undefined;
  const imageUrl = product.image_front_small_url?.trim() || undefined;

  return {
    name: name || `Продукт ${barcode}`,
    ingredients: ingredients || name,
    barcode,
    brand,
    imageUrl,
    allergenTags: mapExternalAllergenIds(product.allergens_tags ?? []),
    traceTags: mapExternalAllergenIds(product.traces_tags ?? []),
    source,
  };
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OFF_SEARCH_TIMEOUT_MS);
  try {
    return await fetch(url, { headers: headers(), signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFromDataset(
  barcode: string,
  dataset: (typeof OFF_FAMILY_DATASETS)[number],
): Promise<OpenFoodFactsProduct | null> {
  const response = await fetchWithTimeout(
    `${dataset.url}/api/v2/product/${barcode}.json?fields=${PRODUCT_FIELDS}`,
  );

  if (!response.ok) return null;

  const data = (await response.json()) as { status?: number; product?: OffProductPayload };
  if (data.status !== 1 || !data.product) return null;

  return normalizeOffProduct(data.product, dataset.source, barcode);
}

export async function fetchProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const normalized = barcode.replace(/\D/g, '');
  if (!normalized) return null;

  try {
    for (const dataset of OFF_FAMILY_DATASETS) {
      const product = await fetchFromDataset(normalized, dataset);
      if (product) return product;
    }
    return null;
  } catch (error) {
    logCaughtError('fetchProductByBarcode', error, { extra: { barcode: normalized } });
    return null;
  }
}

async function searchDatasetByName(
  query: string,
  dataset: (typeof OFF_FAMILY_DATASETS)[number],
  pageSize: number,
): Promise<OpenFoodFactsProduct[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: String(Math.min(Math.max(pageSize, 1), 20)),
    fields: PRODUCT_FIELDS,
  });

  const response = await fetchWithTimeout(`${dataset.url}/cgi/search.pl?${params}`);
  if (!response.ok) return [];

  const data = (await response.json()) as { products?: OffProductPayload[] };
  if (!Array.isArray(data.products)) return [];

  const seen = new Set<string>();
  const results: OpenFoodFactsProduct[] = [];
  for (const product of data.products) {
    const normalized = normalizeOffProduct(product, dataset.source);
    if (!normalized || seen.has(normalized.barcode)) continue;
    seen.add(normalized.barcode);
    results.push(normalized);
  }
  return results;
}

/** Full-text search across OFF + Open Beauty Facts + Open Products Facts. */
export async function searchProductsByName(
  query: string,
  pageSize = 8,
): Promise<OpenFoodFactsProduct[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  try {
    const perDataset = Math.max(3, Math.ceil(pageSize / OFF_FAMILY_DATASETS.length));
    const batches = await Promise.all(
      OFF_FAMILY_DATASETS.map((dataset) => searchDatasetByName(term, dataset, perDataset)),
    );
    const seen = new Set<string>();
    const results: OpenFoodFactsProduct[] = [];
    for (const batch of batches) {
      for (const product of batch) {
        if (seen.has(product.barcode)) continue;
        seen.add(product.barcode);
        results.push(product);
      }
    }
    return results;
  } catch (error) {
    if (!(error instanceof Error && error.name === 'AbortError')) {
      logCaughtError('searchProductsByName', error, { extra: { query: term } });
    }
    return [];
  }
}
