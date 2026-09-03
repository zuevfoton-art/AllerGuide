import {
  OFF_DEFAULT_DATASETS,
  OFF_DEFAULT_USER_AGENT,
  buildOffProductApiUrl,
  buildOffSearchUrl,
  normalizeOffBarcode,
  normalizeOffProduct,
  type NormalizedOffProduct,
  type OffFamilySource,
  type OffProductPayload,
} from '@allerguide/core';
import { logCaughtError } from '@/src/services/error-reporting';

export type { OffFamilySource };

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

const OFF_SEARCH_TIMEOUT_MS = 4000;

function headers(): Record<string, string> {
  return { 'User-Agent': OFF_DEFAULT_USER_AGENT, Accept: 'application/json' };
}

function toMobileProduct(product: NormalizedOffProduct): OpenFoodFactsProduct {
  return {
    name: product.name,
    ingredients: product.ingredients || product.name,
    barcode: product.barcode,
    brand: product.brand || undefined,
    imageUrl: product.imageUrl || undefined,
    allergenTags: product.allergenTags,
    traceTags: product.traceTags,
    source: product.source,
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
  dataset: (typeof OFF_DEFAULT_DATASETS)[number],
): Promise<OpenFoodFactsProduct | null> {
  const response = await fetchWithTimeout(buildOffProductApiUrl(dataset.url, barcode));

  if (!response.ok) return null;

  const data = (await response.json()) as {
    status?: number;
    product?: OffProductPayload;
  };
  if (data.status !== 1 || !data.product) return null;

  const normalized = normalizeOffProduct(data.product, dataset.source, barcode);
  return normalized ? toMobileProduct(normalized) : null;
}

export async function fetchProductByBarcode(barcode: string): Promise<OpenFoodFactsProduct | null> {
  const normalized = normalizeOffBarcode(barcode);
  if (!normalized) return null;

  try {
    for (const dataset of OFF_DEFAULT_DATASETS) {
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
  dataset: (typeof OFF_DEFAULT_DATASETS)[number],
  pageSize: number,
): Promise<OpenFoodFactsProduct[]> {
  const response = await fetchWithTimeout(
    buildOffSearchUrl(dataset.url, query, pageSize, { maxPageSize: 20 }),
  );
  if (!response.ok) return [];

  const data = (await response.json()) as { products?: OffProductPayload[] };
  if (!Array.isArray(data.products)) return [];

  const seen = new Set<string>();
  const results: OpenFoodFactsProduct[] = [];
  for (const product of data.products) {
    const normalized = normalizeOffProduct(product, dataset.source);
    if (!normalized || seen.has(normalized.barcode)) continue;
    seen.add(normalized.barcode);
    results.push(toMobileProduct(normalized));
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
    const perDataset = Math.max(3, Math.ceil(pageSize / OFF_DEFAULT_DATASETS.length));
    const batches = await Promise.all(
      OFF_DEFAULT_DATASETS.map((dataset) => searchDatasetByName(term, dataset, perDataset)),
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
