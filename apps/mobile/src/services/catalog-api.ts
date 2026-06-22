import { getApiBaseUrl } from '@/src/services/api-client';

export interface CatalogProduct {
  barcode: string;
  name: string;
  ingredients: string;
  allergenTags: string[];
}

/**
 * Looks up a product in the backend catalog (`/api/products/:barcode`).
 * Returns null on miss/offline so callers can fall back to Open Food Facts.
 */
export async function fetchProductFromCatalog(barcode: string): Promise<CatalogProduct | null> {
  const normalized = barcode.replace(/\s+/g, '').trim();
  if (!normalized) return null;

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/products/${encodeURIComponent(normalized)}`);
    if (!response.ok) return null;

    const data = (await response.json()) as {
      ok?: boolean;
      product?: {
        barcode?: string;
        name?: string;
        ingredients?: string;
        allergenTags?: string[];
      };
    };

    if (!data.ok || !data.product?.barcode) return null;

    return {
      barcode: data.product.barcode,
      name: data.product.name ?? `Продукт ${normalized}`,
      ingredients: data.product.ingredients ?? '',
      allergenTags: Array.isArray(data.product.allergenTags) ? data.product.allergenTags : [],
    };
  } catch {
    return null;
  }
}
