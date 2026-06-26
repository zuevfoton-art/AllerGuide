import { getApiBaseUrl } from '@/src/services/api-client';
import {
  cachedCatalogProductToDto,
  getCachedCatalogProduct,
  saveCachedCatalogProduct,
} from '@/src/services/catalog-cache-service';

export interface CatalogProduct {
  barcode: string;
  name: string;
  brand: string;
  imageUrl: string;
  ingredients: string;
  allergenTags: string[];
  traceTags: string[];
}

interface ProductDto {
  barcode?: string;
  name?: string;
  brand?: string;
  imageUrl?: string;
  ingredients?: string;
  allergenTags?: string[];
  traceTags?: string[];
  source?: string;
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
    traceTags: Array.isArray(dto.traceTags) ? dto.traceTags : [],
  };
}

/**
 * Looks up a product: offline catalog cache first, then backend API (catalog DB
 * source of truth with OFF write-through). Successful API hits are cached locally.
 */
export async function fetchProductFromCatalog(barcode: string): Promise<CatalogProduct | null> {
  const normalized = barcode.replace(/\s+/g, '').trim();
  if (!normalized) return null;

  const cached = getCachedCatalogProduct(normalized);
  if (cached) return cachedCatalogProductToDto(cached);

  try {
    const response = await fetch(`${getApiBaseUrl()}/api/products/${encodeURIComponent(normalized)}`);
    if (!response.ok) return null;

    const data = (await response.json()) as {
      ok?: boolean;
      product?: ProductDto;
      source?: string;
    };
    if (!data.ok || !data.product) return null;

    const product = toCatalogProduct(data.product, normalized);
    if (!product) return null;

    saveCachedCatalogProduct(product, data.source ?? 'api');
    return product;
  } catch {
    return null;
  }
}

/**
 * Full-text product search via backend catalog; caches each result for offline reuse.
 */
export async function searchProductsFromCatalog(query: string): Promise<CatalogProduct[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  try {
    const response = await fetch(
      `${getApiBaseUrl()}/api/products/search?q=${encodeURIComponent(term)}`,
    );
    if (!response.ok) return [];

    const data = (await response.json()) as {
      ok?: boolean;
      products?: ProductDto[];
      source?: string;
    };
    if (!data.ok || !Array.isArray(data.products)) return [];

    return data.products
      .map((dto) => {
        const product = toCatalogProduct(dto);
        if (product) saveCachedCatalogProduct(product, data.source ?? 'api');
        return product;
      })
      .filter((product): product is CatalogProduct => product !== null);
  } catch {
    return [];
  }
}
