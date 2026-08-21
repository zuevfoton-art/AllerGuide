import { parseAllergies } from './profile-allergens';
import {
  DEFAULT_MARKET_MERCHANT_PRIORITY,
  type MarketMerchant,
  type MarketOffer,
} from './market-offers';
import {
  MARKETPLACE_SEED_PRODUCTS,
  publishedMarketplaceSeed,
  toCatalogProduct,
  type MarketplaceCategory,
  type MarketplaceProductKind,
} from './marketplace-catalog';

export interface CatalogProduct {
  id: string;
  title: string;
  why: string;
  icon: string;
  tag: string;
  colorKey: 'purple' | 'pink' | 'accent' | 'success' | 'warning';
  forAllergens: string[];
  containsAllergens: string[];
  /**
   * Optional legacy single deeplink (P5.5). Prefer `offers` for multi-merchant CTAs.
   * Kept for backward compatibility with older clients.
   */
  affiliateUrl?: string;
  /** Curated merchant offers (Yandex Market first for RU). */
  offers?: MarketOffer[];
  imageUrl?: string;
  kind?: MarketplaceProductKind;
  category?: MarketplaceCategory;
  priceRub?: number;
  showPrice?: boolean;
}

export interface CatalogPlace {
  id: string;
  title: string;
  note: string;
  level: 'high' | 'medium' | 'low';
  icon: string;
  lat: number;
  lng: number;
  tags: string[];
}

export const CATALOG_PRODUCTS: CatalogProduct[] = publishedMarketplaceSeed().map(toCatalogProduct);

/** Full curated marketplace seed including medicines. */
export const MARKETPLACE_CATALOG_PRODUCTS = MARKETPLACE_SEED_PRODUCTS;

export const CATALOG_PLACES: CatalogPlace[] = [
  {
    id: 'green-bowl',
    title: 'Green Bowl Cafe',
    note: 'Меню с маркировкой аллергенов, без арахиса на кухне',
    level: 'high',
    icon: 'leaf',
    lat: 55.7558,
    lng: 37.6173,
    tags: ['Москва', 'nut-free', 'gluten-free-options'],
  },
  {
    id: 'simple-kitchen',
    title: 'Simple Family Kitchen',
    note: 'Уточняйте состав у официанта, возможен контакт с молоком',
    level: 'medium',
    icon: 'restaurant',
    lat: 55.7512,
    lng: 37.6184,
    tags: ['Москва', 'family', 'customizable'],
  },
  {
    id: 'pharmacy-plus',
    title: 'Pharmacy Plus',
    note: 'Антигистаминные и автоинжекторы, круглосуточно',
    level: 'high',
    icon: 'medkit',
    lat: 55.7601,
    lng: 37.6109,
    tags: ['Москва', 'pharmacy', '24h'],
  },
  {
    id: 'rice-bar',
    title: 'Rice Bar',
    note: 'Блюда на рисовой основе, без глютена и молока в базовом меню',
    level: 'high',
    icon: 'restaurant',
    lat: 55.7489,
    lng: 37.6255,
    tags: ['Москва', 'gluten-free', 'dairy-free'],
  },
  {
    id: 'zelenograd-garden',
    title: 'Zelenograd Garden Cafe',
    note: 'Сезонное меню с указанием аллергенов, отдельная зона без орехов',
    level: 'high',
    icon: 'leaf',
    lat: 55.982,
    lng: 37.181,
    tags: ['Московская область', 'Зеленоград', 'nut-free'],
  },
  {
    id: 'khimki-family',
    title: 'Khimki Family Kitchen',
    note: 'Семейное кафе, возможна адаптация блюд под аллергию на молоко',
    level: 'medium',
    icon: 'restaurant',
    lat: 55.897,
    lng: 37.429,
    tags: ['Московская область', 'Химки', 'family'],
  },
  {
    id: 'podolsk-pharmacy',
    title: 'Podolsk Pharmacy 24',
    note: 'Антигистаминные препараты и автоинжекторы, круглосуточно',
    level: 'high',
    icon: 'medkit',
    lat: 55.424,
    lng: 37.554,
    tags: ['Московская область', 'Подольск', 'pharmacy', '24h'],
  },
  {
    id: 'balashikha-rice',
    title: 'Balashikha Rice Bar',
    note: 'Рисовая кухня без глютена, уточняйте состав соусов',
    level: 'high',
    icon: 'restaurant',
    lat: 55.809,
    lng: 37.958,
    tags: ['Московская область', 'Балашиха', 'gluten-free'],
  },
  {
    id: 'odintsovo-cafe',
    title: 'Odintsovo Clean Plate',
    note: 'Прозрачная маркировка аллергенов, без арахиса в заготовках',
    level: 'high',
    icon: 'leaf',
    lat: 55.678,
    lng: 37.277,
    tags: ['Московская область', 'Одинцово', 'nut-free'],
  },
  {
    id: 'mytishchi-pharmacy',
    title: 'Mytishchi Health Point',
    note: 'Аптека с аллергологическими препаратами и косметикой для атопии',
    level: 'medium',
    icon: 'medkit',
    lat: 55.911,
    lng: 37.730,
    tags: ['Московская область', 'Мытищи', 'pharmacy'],
  },
];

export function parseProfileAllergens(allergiesJson: string): string[] {
  return parseAllergies(allergiesJson);
}

export function filterProductsForProfile(
  products: CatalogProduct[],
  profileAllergens: string[],
): CatalogProduct[] {
  return products.filter((product) => {
    const containsConflict = product.containsAllergens.some((allergen) =>
      profileAllergens.includes(allergen),
    );
    if (containsConflict) return false;
    if (product.forAllergens.length === 0) return true;
    return product.forAllergens.some((allergen) => profileAllergens.includes(allergen));
  });
}

/** Normalize offers: explicit `offers` plus legacy `affiliateUrl` as `other`/`iherb`. */
export function getProductOffers(product: CatalogProduct): MarketOffer[] {
  if (product.offers && product.offers.length > 0) {
    return product.offers;
  }
  if (product.affiliateUrl) {
    const merchant: MarketMerchant = /iherb\.com/i.test(product.affiliateUrl)
      ? 'iherb'
      : 'other';
    return [{ merchant, url: product.affiliateUrl }];
  }
  return [];
}

export function getPrimaryOffer(
  product: CatalogProduct,
  preferred: MarketMerchant = 'yandex_market',
  priority: readonly MarketMerchant[] = DEFAULT_MARKET_MERCHANT_PRIORITY,
): MarketOffer | undefined {
  const offers = getProductOffers(product);
  if (offers.length === 0) return undefined;

  const preferredHit = offers.find((offer) => offer.merchant === preferred);
  if (preferredHit) return preferredHit;

  for (const merchant of priority) {
    const hit = offers.find((offer) => offer.merchant === merchant);
    if (hit) return hit;
  }
  return offers[0];
}

export function resolveProductBuyUrl(
  product: CatalogProduct,
  preferred: MarketMerchant = 'yandex_market',
): string | undefined {
  return getPrimaryOffer(product, preferred)?.url ?? product.affiliateUrl;
}

export function filterPlacesForProfile(
  places: CatalogPlace[],
  _profileAllergens: string[],
): CatalogPlace[] {
  return [...places].sort((a, b) => {
    const score = (place: CatalogPlace) =>
      place.level === 'high' ? 2 : place.level === 'medium' ? 1 : 0;
    return score(b) - score(a);
  });
}

export function getPlaceLevelColor(level: CatalogPlace['level'], isDark: boolean) {
  if (level === 'high') return isDark ? '#30D158' : '#34C759';
  if (level === 'medium') return isDark ? '#FF9F0A' : '#FF9500';
  return isDark ? '#FF453A' : '#FF3B30';
}

export function getPlaceLevelLabel(level: CatalogPlace['level']) {
  if (level === 'high') return 'Высокий';
  if (level === 'medium') return 'Средний';
  return 'Низкий';
}
