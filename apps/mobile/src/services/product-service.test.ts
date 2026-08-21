import { describe, expect, it, vi, beforeEach } from 'vitest';
import { publishedMarketplaceSeed } from '@allerguide/core';

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

const {
  fetchMarketCatalog,
  getApiBaseUrl,
  getCachedMarketCatalog,
  getFreshMarketCatalog,
  saveMarketCatalogSnapshot,
} = vi.hoisted(() => ({
  fetchMarketCatalog: vi.fn(),
  getApiBaseUrl: vi.fn(() => ''),
  getCachedMarketCatalog: vi.fn(() => null),
  getFreshMarketCatalog: vi.fn(() => null),
  saveMarketCatalogSnapshot: vi.fn(),
}));

vi.mock('@/src/services/api-client', () => ({ getApiBaseUrl }));
vi.mock('@/src/services/market-api', () => ({ fetchMarketCatalog }));
vi.mock('@/src/services/market-catalog-cache-service', () => ({
  getCachedMarketCatalog,
  getFreshMarketCatalog,
  saveMarketCatalogSnapshot,
}));
vi.mock('@/src/services/analytics-service', () => ({
  trackEvent: vi.fn(),
}));
vi.mock('@/src/services/error-reporting', () => ({
  logCaughtError: vi.fn(),
}));

import {
  getBundledMarketplaceProducts,
  getRecommendedMarketplaceProducts,
  loadMarketplaceCatalog,
  searchRecommendedMarketplaceProducts,
} from './product-service';

const STAGING_LEGACY_CATALOG = [
  {
    id: 'air-purifier',
    title: 'Очиститель воздуха HEPA',
    why: 'Снижает концентрацию пыльцы',
    icon: 'cloudy',
    tag: 'Воздух',
    colorKey: 'purple',
    forAllergens: ['Пыльца берёзы'],
    containsAllergens: [],
    offers: [{ merchant: 'yandex_market', url: 'https://market.yandex.ru/search?text=hepa' }],
  },
];

describe('product-service marketplace catalog', () => {
  it('returns bundled products with photos', () => {
    const products = getBundledMarketplaceProducts();
    expect(products.length).toBeGreaterThanOrEqual(10);
    expect(products.every((product) => product.imageUrl.startsWith('https://'))).toBe(true);
  });

  it('hides conflicting food items for a milk profile', () => {
    const products = getRecommendedMarketplaceProducts(getBundledMarketplaceProducts(), {
      id: 1,
      userId: 1,
      name: 'Test',
      allergies: JSON.stringify(['milk']),
    } as never);
    expect(products.some((product) => product.containsAllergenIds.includes('milk'))).toBe(false);
  });

  it('filters pharmacy category and search', () => {
    const hits = searchRecommendedMarketplaceProducts(
      getBundledMarketplaceProducts(),
      null,
      'цетиризин',
      'pharmacy',
    );
    expect(hits.map((product) => product.id)).toContain('cetirizine-otc');
    expect(hits.every((product) => product.category === 'pharmacy')).toBe(true);
  });

  beforeEach(() => {
    fetchMarketCatalog.mockReset();
    getApiBaseUrl.mockReset();
    getCachedMarketCatalog.mockReset();
    getFreshMarketCatalog.mockReset();
    saveMarketCatalogSnapshot.mockReset();
    getApiBaseUrl.mockReturnValue('');
    fetchMarketCatalog.mockResolvedValue(null);
    getCachedMarketCatalog.mockReturnValue(null);
    getFreshMarketCatalog.mockReturnValue(null);
  });

  it('loads the bundled seed when the API is not configured', async () => {
    const result = await loadMarketplaceCatalog();
    expect(result.source).toBe('seed');
    expect(result.stale).toBe(false);
    expect(result.items.length).toBeGreaterThanOrEqual(10);
    expect(result.items.some((product) => product.kind === 'medicine')).toBe(true);
  });

  it('ignores the legacy staging catalog and does not cache it', async () => {
    getApiBaseUrl.mockReturnValue('https://api.staging.aclearo.com');
    fetchMarketCatalog.mockResolvedValue(STAGING_LEGACY_CATALOG);

    const result = await loadMarketplaceCatalog();

    expect(result.source).toBe('seed');
    expect(result.items.some((product) => product.id === 'cetirizine-otc')).toBe(true);
    expect(saveMarketCatalogSnapshot).not.toHaveBeenCalled();
    expect(
      searchRecommendedMarketplaceProducts(result.items, null, 'цетиризин').map(
        (product) => product.id,
      ),
    ).toContain('cetirizine-otc');
  });

  it('ignores a poisoned last-good snapshot of the legacy catalog', async () => {
    getApiBaseUrl.mockReturnValue('https://api.staging.aclearo.com');
    fetchMarketCatalog.mockResolvedValue(STAGING_LEGACY_CATALOG);
    getFreshMarketCatalog.mockReturnValue({
      fetchedAt: new Date().toISOString(),
      source: 'api',
      products: STAGING_LEGACY_CATALOG,
    });
    getCachedMarketCatalog.mockReturnValue({
      fetchedAt: new Date().toISOString(),
      source: 'api',
      products: STAGING_LEGACY_CATALOG,
    });

    const result = await loadMarketplaceCatalog();
    expect(result.source).toBe('seed');
    expect(result.items.length).toBeGreaterThanOrEqual(10);
  });

  it('uses a curated live catalog and caches it', async () => {
    const live = publishedMarketplaceSeed();
    getApiBaseUrl.mockReturnValue('https://api.staging.aclearo.com');
    fetchMarketCatalog.mockResolvedValue(live);

    const result = await loadMarketplaceCatalog();

    expect(result.source).toBe('api');
    expect(result.items.map((product) => product.id)).toEqual(live.map((product) => product.id));
    expect(saveMarketCatalogSnapshot).toHaveBeenCalledWith(result.items, 'api');
  });
});
