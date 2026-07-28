/**
 * Curated marketplace offer model (P5.5 / Yandex Market affiliate).
 *
 * Allergy filtering stays on CatalogProduct.containsAllergens —
 * merchant APIs must never be the sole source of “safe for profile” decisions.
 */

export const MARKET_MERCHANTS = [
  'yandex_market',
  'iherb',
  'wildberries',
  'ozon',
  'pharmacy',
  'other',
] as const;

export type MarketMerchant = (typeof MARKET_MERCHANTS)[number];

export interface MarketOffer {
  merchant: MarketMerchant;
  /** Deep-link or affiliate URL (seed static or server-resolved). */
  url: string;
  /** Merchant SKU / Yandex marketArticle when known. */
  sku?: string;
  /** Ad marking token (erid) when required for the creative. */
  erid?: string;
  /** Optional price snapshot in RUB from affiliate enrich. */
  priceRub?: number;
  /** Optional product photo from affiliate enrich. */
  photoUrl?: string;
  /** ISO timestamp when price/photo were last refreshed. */
  refreshedAt?: string;
}

/** Prefer Yandex Market as the primary RU deep-link partner. */
export const DEFAULT_MARKET_MERCHANT_PRIORITY: readonly MarketMerchant[] = [
  'yandex_market',
  'wildberries',
  'ozon',
  'pharmacy',
  'iherb',
  'other',
];

export function isMarketMerchant(value: string): value is MarketMerchant {
  return (MARKET_MERCHANTS as readonly string[]).includes(value);
}

export function merchantDisplayName(merchant: MarketMerchant): string {
  switch (merchant) {
    case 'yandex_market':
      return 'Яндекс Маркет';
    case 'iherb':
      return 'iHerb';
    case 'wildberries':
      return 'Wildberries';
    case 'ozon':
      return 'Ozon';
    case 'pharmacy':
      return 'Аптека';
    default:
      return 'Магазин';
  }
}

/**
 * Append partner tracking params to a market.yandex.ru URL when clid/erid are known.
 * Used as offline / no-API fallback; prefer server link/create when credentials exist.
 */
export function appendYandexPartnerParams(
  url: string,
  params: { clid?: string; vid?: string; erid?: string },
): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (!/(^|\.)market\.yandex\.ru$/i.test(parsed.hostname)) {
    return url;
  }

  if (params.clid) parsed.searchParams.set('clid', params.clid);
  if (params.vid) parsed.searchParams.set('vid', params.vid);
  if (params.erid) parsed.searchParams.set('erid', params.erid);
  return parsed.toString();
}

/** Build a usable deep-link from a Yandex partner article code. */
export function yandexPartnerArticleSearchUrl(partnerArticle: string): string {
  const code = partnerArticle.trim();
  return `https://market.yandex.ru/search?text=${encodeURIComponent(code)}`;
}
