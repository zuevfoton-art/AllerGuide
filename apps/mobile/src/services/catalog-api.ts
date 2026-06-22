import { getApiBaseUrl } from '@/src/services/api-client';

export interface CatalogProduct {
  barcode: string;
  name: string;
  brand: string;
  imageUrl: string;
  ingredients: string;
  allergenTags: string[];
}

interface ProductDto {
  barcode?: string;
  name?: string;
  brand?: string;
  imageUrl?: string;
  ingredients?: string;
  allergenTags?: string[];
}

function toCatalogProduct(dto: ProductDto, fallbackBarcode = ''): CatalogProduct | null {
  const barcode = dto.barcode ?? fallbackBarcode;
  if (!barcode) return null;
  return {
    barcode,
    name: dto.name ?? `Продукт ${barcode}`,
    brand: dto.brand ?? '',
    imageUrl: dto.imageUrl ?? '',
    ingredients: dto.ingredients ?? '',
    allergenTags: Array.isArray(dto.allergenTags) ? dto.allergenTags : [],
  };
}

/**
 * Looks up a product in the backend catalog (`/api/products/:barcode`), which
 * fetches on demand from Open Food Facts on a cache miss.
 * Returns null on miss/offline so callers can fall back to a direct OFF lookup.
 */
export async function fetchProductFromCatalog(barcode: string): Promise<CatalogProduct | null> {
  const normalized = barcode.replace(/\s+/g, '').trim();
  if (!normalized) return null;

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/products/${encodeURIComponent(normalized)}`);
    if (!response.ok) return null;

    const data = (await response.json()) as { ok?: boolean; product?: ProductDto };
    if (!data.ok || !data.product) return null;

    return toCatalogProduct(data.product, normalized);
  } catch {
    return null;
  }
}

/**
 * Full-text product search via the backend catalog (`/api/products/search`),
 * which queries Open Food Facts on demand when nothing is cached locally.
 */
export async function searchProductsFromCatalog(query: string): Promise<CatalogProduct[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  try {
    const response = await fetch(
      `${getApiBaseUrl()}/api/products/search?q=${encodeURIComponent(term)}`,
    );
    if (!response.ok) return [];

    const data = (await response.json()) as { ok?: boolean; products?: ProductDto[] };
    if (!data.ok || !Array.isArray(data.products)) return [];

    return data.products
      .map((dto) => toCatalogProduct(dto))
      .filter((product): product is CatalogProduct => product !== null);
  } catch {
    return [];
  }
}
