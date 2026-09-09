import {
  OFF_DEFAULT_BASE_URLS,
  OFF_DEFAULT_USER_AGENT,
  OFF_FAMILY_SOURCES,
  buildOffProductApiUrl,
  buildOffSearchUrl,
  categoryFromOffSource,
  normalizeOffBarcode,
  normalizeOffProduct,
  type NormalizedOffProduct,
  type OffFamilySource,
  type OffProductCategory,
  type OffProductPayload,
} from '@allerguide/core';
import { logCaughtError } from '../lib/log-caught-error';

export type { OffFamilySource };
export type ProductCategory = OffProductCategory;
export type NormalizedProduct = NormalizedOffProduct;
export { categoryFromOffSource };

const OFF_FAMILY_ENV_KEYS: Record<OffFamilySource, string> = {
  openfoodfacts: 'OPENFOODFACTS_BASE_URL',
  openbeautyfacts: 'OPENBEAUTYFACTS_BASE_URL',
  openproductsfacts: 'OPENPRODUCTSFACTS_BASE_URL',
};

function datasetBaseUrl(source: OffFamilySource): string {
  return process.env[OFF_FAMILY_ENV_KEYS[source]] || OFF_DEFAULT_BASE_URLS[source];
}

/**
 * Open Food Facts requires a descriptive User-Agent identifying the app and a
 * contact. See https://openfoodfacts.github.io/openfoodfacts-server/api/
 */
function userAgent(): string {
  return process.env.OPENFOODFACTS_USER_AGENT || OFF_DEFAULT_USER_AGENT;
}

function headers(): Record<string, string> {
  return { 'User-Agent': userAgent(), Accept: 'application/json' };
}

async function fetchFromDataset(
  barcode: string,
  source: OffFamilySource,
): Promise<NormalizedProduct | null> {
  try {
    const response = await fetch(buildOffProductApiUrl(datasetBaseUrl(source), barcode), {
      headers: headers(),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { status?: number; product?: OffProductPayload };
    if (data.status !== 1 || !data.product) return null;

    return normalizeOffProduct(data.product, source, barcode);
  } catch (error) {
    logCaughtError('fetchOpenFoodFactsProduct', error, {
      barcode,
      source,
    });
    return null;
  }
}

/** On-demand product lookup by barcode: OFF → Open Beauty Facts → Open Products Facts. */
export async function fetchOpenFoodFactsProduct(
  barcode: string,
): Promise<NormalizedProduct | null> {
  const normalized = normalizeOffBarcode(barcode);
  if (!normalized) return null;

  for (const source of OFF_FAMILY_SOURCES) {
    const product = await fetchFromDataset(normalized, source);
    if (product) return product;
  }
  return null;
}

/**
 * On-demand full-text product search from the Open Food Facts API.
 * Returns normalized products (allergen tags mapped to canonical ids).
 */
async function searchDataset(
  query: string,
  source: OffFamilySource,
  pageSize: number,
): Promise<NormalizedProduct[]> {
  try {
    const response = await fetch(
      buildOffSearchUrl(datasetBaseUrl(source), query, pageSize, { maxPageSize: 50 }),
      { headers: headers() },
    );
    if (!response.ok) return [];

    const data = (await response.json()) as { products?: OffProductPayload[] };
    if (!Array.isArray(data.products)) return [];

    const seen = new Set<string>();
    const results: NormalizedProduct[] = [];
    for (const product of data.products) {
      const normalizedProduct = normalizeOffProduct(product, source);
      if (!normalizedProduct || seen.has(normalizedProduct.barcode)) continue;
      seen.add(normalizedProduct.barcode);
      results.push(normalizedProduct);
    }
    return results;
  } catch (error) {
    logCaughtError('searchOpenFoodFacts', error, { query, source });
    return [];
  }
}

/**
 * Full-text search across OFF + Open Beauty Facts + Open Products Facts.
 */
export async function searchOpenFoodFacts(
  query: string,
  pageSize = 20,
): Promise<NormalizedProduct[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  const perDataset = Math.max(4, Math.ceil(pageSize / OFF_FAMILY_SOURCES.length));
  const batches = await Promise.all(
    OFF_FAMILY_SOURCES.map((source) => searchDataset(term, source, perDataset)),
  );

  const seen = new Set<string>();
  const results: NormalizedProduct[] = [];
  for (const batch of batches) {
    for (const product of batch) {
      if (seen.has(product.barcode)) continue;
      seen.add(product.barcode);
      results.push(product);
    }
  }
  return results;
}
