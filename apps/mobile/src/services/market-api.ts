import { getApiBaseUrl } from '@/src/services/api-client';
import type { MarketMerchant } from '@allerguide/core';

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
