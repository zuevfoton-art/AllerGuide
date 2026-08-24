import type { MarketMerchant, MarketplaceProduct } from '@allerguide/core';
import { getApiBaseUrl } from '@/src/services/api-client';

export interface YandexResolveResponse {
  ok: boolean;
  affiliateUrl?: string;
  merchant?: 'yandex_market';
  source?: 'api' | 'cache' | 'static' | 'fallback';
  title?: string;
  priceRub?: number;
  photoUrl?: string;
  error?: string;
}

export interface MarketCatalogResponse {
  ok: boolean;
  source?: 'db' | 'seed';
  products?: MarketplaceProduct[];
  total?: number;
  error?: string;
}

/**
 * Resolve a curated Yandex Market offer via our API (secrets stay server-side).
 * Falls back to the seed URL when the API is unreachable or not configured.
 */
export async function resolveYandexMarketOffer(input: {
  productId?: string;
  marketUrl?: string;
  marketArticle?: string;
  fallbackUrl: string;
}): Promise<{ url: string; merchant: MarketMerchant; source: string }> {
  const base = getApiBaseUrl().replace(/\/$/, '');
  if (!base) {
    return { url: input.fallbackUrl, merchant: 'yandex_market', source: 'seed' };
  }

  try {
    const response = await fetch(`${base}/api/market/offers/yandex/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: input.productId,
        marketUrl: input.marketUrl,
        marketArticle: input.marketArticle,
      }),
    });
    const payload = (await response.json()) as YandexResolveResponse;
    if (response.ok && payload.affiliateUrl) {
      return {
        url: payload.affiliateUrl,
        merchant: 'yandex_market',
        source: payload.source ?? 'api',
      };
    }
  } catch {
    // Offline / API down — open seed deep-link.
  }

  return { url: input.fallbackUrl, merchant: 'yandex_market', source: 'seed' };
}

export async function fetchMarketCatalog(options?: {
  category?: string;
  kind?: string;
  limit?: number;
}): Promise<MarketplaceProduct[] | null> {
  const base = getApiBaseUrl().replace(/\/$/, '');
  if (!base) return null;

  const params = new URLSearchParams();
  if (options?.category) params.set('category', options.category);
  if (options?.kind) params.set('kind', options.kind);
  params.set('limit', String(options?.limit ?? 80));

  const response = await fetch(`${base}/api/market/catalog?${params.toString()}`);
  const payload = (await response.json()) as MarketCatalogResponse;
  if (!response.ok || !payload.ok || !Array.isArray(payload.products)) {
    return null;
  }
  // Caller must normalize: staging may still return the pre-#276 CatalogProduct shape.
  return payload.products;
}
