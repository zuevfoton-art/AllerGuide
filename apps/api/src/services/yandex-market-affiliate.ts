import {
  appendYandexPartnerParams,
  CATALOG_PRODUCTS,
  yandexPartnerArticleSearchUrl,
  type CatalogProduct,
  type MarketOffer,
} from '@allerguide/core';
import { logCaughtError } from '../lib/log-caught-error';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type YandexResolveSource = 'api' | 'cache' | 'static' | 'fallback';

export interface YandexResolveResult {
  affiliateUrl: string;
  merchant: 'yandex_market';
  source: YandexResolveSource;
  title?: string;
  priceRub?: number;
  photoUrl?: string;
  marketArticle?: string;
  partnerArticle?: string;
  refreshedAt: string;
}

interface CacheEntry {
  expiresAt: number;
  result: YandexResolveResult;
}

const resolveCache = new Map<string, CacheEntry>();

function apiBase(): string {
  return (
    process.env.YANDEX_MARKET_API_BASE?.trim() ||
    'https://api.content.market.yandex.ru/v3/affiliate'
  );
}

export function getYandexMarketClid(): string | undefined {
  return process.env.YANDEX_MARKET_CLID?.trim() || undefined;
}

export function getYandexMarketErid(): string | undefined {
  return process.env.YANDEX_MARKET_ERID?.trim() || undefined;
}

function oauthToken(): string | undefined {
  return process.env.YANDEX_MARKET_OAUTH_TOKEN?.trim() || undefined;
}

export function isYandexMarketConfigured(): boolean {
  return Boolean(getYandexMarketClid() && oauthToken());
}

export function isYandexCuratorSearchEnabled(): boolean {
  return process.env.YANDEX_MARKET_CURATOR_SEARCH === 'true' && isYandexMarketConfigured();
}

function cacheKey(input: { marketUrl?: string; marketArticle?: string }): string {
  return `${input.marketArticle ?? ''}|${input.marketUrl ?? ''}`;
}

function authHeaders(): Record<string, string> {
  const token = oauthToken();
  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `OAuth ${token}` } : {}),
  };
}

function staticFallbackUrl(marketUrl: string): string {
  return appendYandexPartnerParams(marketUrl, {
    clid: getYandexMarketClid(),
    erid: getYandexMarketErid(),
  });
}

interface PartnerLinkResponse {
  status?: string;
  link?: {
    url?: string;
    shortUrl?: string;
    title?: string;
  } | null;
  price?: number;
  stockAmount?: number;
}

interface PartnerArticleResponse {
  status?: string;
  partnerArticle?: {
    partnerArticle?: string;
    marketArticle?: string;
    productPhoto?: string;
    title?: string;
  } | null;
  link?: string | null;
  price?: number;
}

async function createPartnerLink(marketUrl: string): Promise<YandexResolveResult | null> {
  const clid = getYandexMarketClid();
  if (!clid || !oauthToken()) return null;

  const endpoint = new URL(`${apiBase()}/partner/link/create`);
  endpoint.searchParams.set('url', marketUrl);
  endpoint.searchParams.set('clid', clid);
  endpoint.searchParams.set('format', 'json');

  const response = await fetch(endpoint.toString(), { headers: authHeaders() });
  if (!response.ok) {
    throw new Error(`Yandex link/create HTTP ${response.status}`);
  }

  const payload = (await response.json()) as PartnerLinkResponse;
  if (payload.status !== 'OK' || !payload.link) return null;

  const affiliateUrl = payload.link.shortUrl?.trim() || payload.link.url?.trim();
  if (!affiliateUrl) return null;

  return {
    affiliateUrl,
    merchant: 'yandex_market',
    source: 'api',
    title: payload.link.title,
    priceRub: typeof payload.price === 'number' ? payload.price : undefined,
    refreshedAt: new Date().toISOString(),
  };
}

async function createPartnerArticle(input: {
  marketUrl?: string;
  marketArticle?: string;
}): Promise<YandexResolveResult | null> {
  const clid = getYandexMarketClid();
  if (!clid || !oauthToken()) return null;

  const endpoint = new URL(`${apiBase()}/partner/article/create`);
  endpoint.searchParams.set('clid', clid);
  endpoint.searchParams.set('format', 'json');

  const body: Record<string, string> = {};
  if (input.marketArticle) body.marketArticle = input.marketArticle;
  if (input.marketUrl) body.marketUrl = input.marketUrl;

  const response = await fetch(endpoint.toString(), {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Yandex article/create HTTP ${response.status}`);
  }

  const payload = (await response.json()) as PartnerArticleResponse;
  if (payload.status !== 'OK' || !payload.partnerArticle?.partnerArticle) return null;

  const partnerArticle = payload.partnerArticle.partnerArticle;
  const affiliateUrl =
    (typeof payload.link === 'string' && payload.link.trim()) ||
    yandexPartnerArticleSearchUrl(partnerArticle);

  return {
    affiliateUrl,
    merchant: 'yandex_market',
    source: 'api',
    title: payload.partnerArticle.title,
    priceRub: typeof payload.price === 'number' ? payload.price : undefined,
    photoUrl: payload.partnerArticle.productPhoto,
    marketArticle: payload.partnerArticle.marketArticle,
    partnerArticle,
    refreshedAt: new Date().toISOString(),
  };
}

export function findSeedYandexOffer(productId?: string): MarketOffer | undefined {
  if (!productId) return undefined;
  const product = CATALOG_PRODUCTS.find((item) => item.id === productId);
  return product?.offers?.find((offer) => offer.merchant === 'yandex_market');
}

export async function resolveYandexOffer(input: {
  marketUrl?: string;
  marketArticle?: string;
  productId?: string;
}): Promise<YandexResolveResult> {
  const seed = findSeedYandexOffer(input.productId);
  const marketUrl = input.marketUrl?.trim() || seed?.url;
  const marketArticle = input.marketArticle?.trim() || seed?.sku;
  const now = new Date().toISOString();

  if (!marketUrl && !marketArticle) {
    throw new Error('marketUrl or marketArticle is required');
  }

  const key = cacheKey({ marketUrl, marketArticle });
  const cached = resolveCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.result, source: 'cache' };
  }

  if (isYandexMarketConfigured()) {
    try {
      let resolved: YandexResolveResult | null = null;
      if (marketUrl) {
        resolved = await createPartnerLink(marketUrl);
      }
      if (!resolved && (marketArticle || marketUrl)) {
        resolved = await createPartnerArticle({ marketUrl, marketArticle });
      }
      if (resolved) {
        resolveCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, result: resolved });
        return resolved;
      }
    } catch (error) {
      logCaughtError('yandexMarket.resolve', error, { level: 'warn' });
    }
  }

  if (marketUrl) {
    const affiliateUrl = staticFallbackUrl(marketUrl);
    const result: YandexResolveResult = {
      affiliateUrl,
      merchant: 'yandex_market',
      source: isYandexMarketConfigured() ? 'fallback' : 'static',
      marketArticle,
      refreshedAt: now,
    };
    resolveCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, result });
    return result;
  }

  // Article-only without API: search by market article.
  const affiliateUrl = yandexPartnerArticleSearchUrl(marketArticle!);
  const result: YandexResolveResult = {
    affiliateUrl,
    merchant: 'yandex_market',
    source: 'static',
    marketArticle,
    refreshedAt: now,
  };
  resolveCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, result });
  return result;
}

export interface CuratorDraftOffer {
  title: string;
  marketUrl?: string;
  marketArticle?: string;
  priceRub?: number;
  photoUrl?: string;
  /** Always false — drafts must never be shown as allergy-safe without curation. */
  allergenCurated: false;
}

/**
 * Affiliate GET /search was retired on 2026-06-22. Curators import the official
 * product feed instead of live search.
 */
export async function searchYandexCuratorDrafts(_query: string): Promise<CuratorDraftOffer[]> {
  if (!isYandexCuratorSearchEnabled()) {
    throw new Error('Curator search is disabled');
  }
  throw new Error('Yandex Affiliate GET /search is no longer supported');
}

export function listCuratedMarketProducts(): CatalogProduct[] {
  return CATALOG_PRODUCTS;
}

/** @internal test helper */
export function __clearYandexResolveCacheForTests() {
  resolveCache.clear();
}
