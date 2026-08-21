import { describe, expect, it } from 'vitest';
import {
  MARKETPLACE_SEED_PRODUCTS,
  canPublishMarketplaceProduct,
  filterMarketplaceProductsForProfile,
  getMarketplacePrimaryOffer,
  isUsableLiveMarketplaceCatalog,
  looksLikePrescriptionText,
  normalizeMarketplaceCatalog,
  publishedMarketplaceSeed,
  searchMarketplaceProducts,
  toCatalogProduct,
} from './marketplace-catalog';

/** Exact staging payload from GET /api/market/catalog (pre-#276 CatalogProduct). */
const STAGING_LEGACY_CATALOG = [
  {
    id: 'air-purifier',
    title: 'Очиститель воздуха HEPA',
    why: 'Снижает концентрацию пыльцы и аллергенов в воздухе',
    icon: 'cloudy',
    tag: 'Воздух',
    colorKey: 'purple',
    forAllergens: ['Пыльца берёзы', 'Пыльца амброзии', 'Пылевые клещи', 'Бытовая аллергия'],
    containsAllergens: [],
    affiliateUrl: 'https://www.iherb.com/search?kw=hepa+air+purifier',
    offers: [
      { merchant: 'yandex_market', url: 'https://market.yandex.ru/search?text=hepa' },
      { merchant: 'iherb', url: 'https://www.iherb.com/search?kw=hepa+air+purifier' },
    ],
  },
  {
    id: 'oat-milk',
    title: 'Овсяное молоко без глютена',
    why: 'Альтернатива коровьему молоку',
    icon: 'nutrition',
    tag: 'Питание',
    colorKey: 'success',
    forAllergens: ['Молоко'],
    containsAllergens: ['Молоко', 'Орехи'],
    offers: [{ merchant: 'yandex_market', url: 'https://market.yandex.ru/search?text=oat' }],
  },
];

describe('marketplace catalog', () => {
  it('publishes curated Yandex and OTC pharmacy seed items', () => {
    const published = publishedMarketplaceSeed();
    expect(published.length).toBeGreaterThanOrEqual(10);
    expect(published.every((product) => product.imageUrl.startsWith('https://'))).toBe(true);
    expect(published.filter((product) => product.provider === 'yandex_market').length).toBeGreaterThanOrEqual(5);
    expect(published.filter((product) => product.kind === 'medicine').length).toBeGreaterThanOrEqual(3);
  });

  it('never publishes prescription or priced medicines', () => {
    for (const product of publishedMarketplaceSeed()) {
      expect(product.prescriptionOnly).toBe(false);
      if (product.kind === 'medicine') {
        expect(product.showPrice).toBe(false);
        expect(product.provider).toBe('pharmacy');
      }
    }
  });

  it('blocks publishing a prescription medicine with a price', () => {
    const draft = {
      ...MARKETPLACE_SEED_PRODUCTS[0]!,
      kind: 'medicine' as const,
      provider: 'pharmacy' as const,
      prescriptionOnly: true,
      showPrice: true,
      priceRub: 199,
    };
    const result = canPublishMarketplaceProduct(draft);
    expect(result.canPublish).toBe(false);
    expect(result.reasons).toContain('prescription_forbidden');
    expect(result.reasons).toContain('medicine_price_forbidden');
  });

  it('filters conflicting allergens by canonical ids', () => {
    const filtered = filterMarketplaceProductsForProfile(publishedMarketplaceSeed(), ['milk']);
    expect(filtered.some((product) => product.containsAllergenIds.includes('milk'))).toBe(false);
    expect(filtered.some((product) => product.id === 'oat-milk')).toBe(false);
    expect(filtered.some((product) => product.id === 'air-purifier')).toBe(true);
  });

  it('shows the published catalog when the profile has no allergen ids', () => {
    const filtered = filterMarketplaceProductsForProfile(publishedMarketplaceSeed(), []);
    expect(filtered.length).toBe(publishedMarketplaceSeed().length);
  });

  it('searches title and category', () => {
    const hits = searchMarketplaceProducts(publishedMarketplaceSeed(), 'цетиризин');
    expect(hits.map((product) => product.id)).toContain('cetirizine-otc');
  });

  it('prefers Yandex as the primary marketplace offer', () => {
    const air = publishedMarketplaceSeed().find((product) => product.id === 'air-purifier');
    expect(getMarketplacePrimaryOffer(air!)?.merchant).toBe('yandex_market');
    expect(toCatalogProduct(air!).imageUrl).toBeTruthy();
  });

  it('detects prescription wording in feed text', () => {
    expect(looksLikePrescriptionText('Таблетки по рецепту')).toBe(true);
    expect(looksLikePrescriptionText('Цетиризин 10 мг')).toBe(false);
  });

  it('rejects the pre-#276 staging CatalogProduct payload as unusable', () => {
    expect(normalizeMarketplaceCatalog(STAGING_LEGACY_CATALOG)).toEqual([]);
    expect(isUsableLiveMarketplaceCatalog(STAGING_LEGACY_CATALOG)).toBe(false);
    expect(isUsableLiveMarketplaceCatalog([])).toBe(false);
  });

  it('accepts a curated published payload from the live API', () => {
    const published = publishedMarketplaceSeed();
    expect(isUsableLiveMarketplaceCatalog(published)).toBe(true);
    expect(normalizeMarketplaceCatalog(published).map((product) => product.id)).toEqual(
      published.map((product) => product.id),
    );
  });

  it('keeps milk conflicts hidden and does not throw on missing containsAllergenIds', () => {
    const incomplete = {
      ...publishedMarketplaceSeed().find((product) => product.id === 'air-purifier')!,
      containsAllergenIds: undefined,
      moderationStatus: undefined,
    };
    expect(() =>
      filterMarketplaceProductsForProfile([incomplete] as never, ['milk']),
    ).not.toThrow();
    expect(filterMarketplaceProductsForProfile([incomplete] as never, ['milk'])).toHaveLength(1);
  });
});
