import {
  filterMarketplaceProductsForProfile,
  isUsableLiveMarketplaceCatalog,
  normalizeMarketplaceCatalog,
  parseProfileAllergenIds,
  publishedMarketplaceSeed,
  rankMarketplaceProductsForProfile,
  searchMarketplaceProducts,
  type MarketplaceCategory,
  type MarketplaceProduct,
  type Profile,
} from '@allerguide/core';
import {
  MARKET_LIVE_CATALOG_ENABLED,
  MARKET_MEDICINES_ENABLED,
} from '@/src/constants/features';
import { getApiBaseUrl } from '@/src/services/api-client';
import { logCaughtError } from '@/src/services/error-reporting';
import { fetchMarketCatalog } from '@/src/services/market-api';
import {
  getCachedMarketCatalog,
  getFreshMarketCatalog,
  saveMarketCatalogSnapshot,
} from '@/src/services/market-catalog-cache-service';
import { trackEvent } from '@/src/services/analytics-service';

export interface MarketplaceCatalogLoad {
  items: MarketplaceProduct[];
  source: 'api' | 'cache' | 'seed';
  stale: boolean;
}

function applyCatalogFlags(products: MarketplaceProduct[]): MarketplaceProduct[] {
  if (MARKET_MEDICINES_ENABLED) return products;
  return products.filter((product) => product.kind !== 'medicine');
}

function usableLiveCatalog(raw: unknown): MarketplaceProduct[] | null {
  if (!isUsableLiveMarketplaceCatalog(raw)) return null;
  return applyCatalogFlags(normalizeMarketplaceCatalog(raw));
}

export function getBundledMarketplaceProducts(): MarketplaceProduct[] {
  return applyCatalogFlags(publishedMarketplaceSeed());
}

export async function loadMarketplaceCatalog(): Promise<MarketplaceCatalogLoad> {
  const shouldFetch = MARKET_LIVE_CATALOG_ENABLED && Boolean(getApiBaseUrl().trim());

  if (shouldFetch) {
    try {
      const remote = await fetchMarketCatalog();
      const usable = usableLiveCatalog(remote);
      if (usable && usable.length > 0) {
        saveMarketCatalogSnapshot(usable, 'api');
        trackEvent('market_catalog_refresh', { source: 'api', count: usable.length });
        return { items: usable, source: 'api', stale: false };
      }
    } catch (error) {
      logCaughtError('loadMarketplaceCatalog.fetch', error, { level: 'warn' });
    }
  }

  const fresh = getFreshMarketCatalog();
  const usableFresh = usableLiveCatalog(fresh?.products);
  if (usableFresh && usableFresh.length > 0) {
    trackEvent('market_catalog_refresh', { source: 'cache', count: usableFresh.length, stale: false });
    return { items: usableFresh, source: 'cache', stale: false };
  }

  const cached = getCachedMarketCatalog();
  const usableCached = usableLiveCatalog(cached?.products);
  if (usableCached && usableCached.length > 0) {
    trackEvent('market_catalog_refresh', { source: 'cache', count: usableCached.length, stale: true });
    return { items: usableCached, source: 'cache', stale: true };
  }

  const seed = getBundledMarketplaceProducts();
  trackEvent('market_catalog_refresh', { source: 'seed', count: seed.length });
  return { items: seed, source: 'seed', stale: false };
}

export function getRecommendedMarketplaceProducts(
  products: MarketplaceProduct[],
  profile?: Profile | null,
): MarketplaceProduct[] {
  const allergenIds = profile ? parseProfileAllergenIds(profile.allergies) : [];
  const filtered = filterMarketplaceProductsForProfile(products, allergenIds);
  return rankMarketplaceProductsForProfile(filtered, allergenIds);
}

export function searchRecommendedMarketplaceProducts(
  products: MarketplaceProduct[],
  profile: Profile | null | undefined,
  query: string,
  category?: MarketplaceCategory | 'all',
): MarketplaceProduct[] {
  const recommended = getRecommendedMarketplaceProducts(products, profile);
  const byCategory =
    !category || category === 'all'
      ? recommended
      : recommended.filter((product) => product.category === category);
  return searchMarketplaceProducts(byCategory, query);
}

/** @deprecated Use searchRecommendedMarketplaceProducts after loadMarketplaceCatalog. */
export function getRecommendedProducts(profile?: Profile | null): MarketplaceProduct[] {
  return getRecommendedMarketplaceProducts(getBundledMarketplaceProducts(), profile);
}

/** @deprecated Use the async catalog loader for live/cache/seed fallback. */
export function searchRecommendedProducts(
  profile: Profile | null | undefined,
  query: string,
): MarketplaceProduct[] {
  return searchRecommendedMarketplaceProducts(getBundledMarketplaceProducts(), profile, query);
}
