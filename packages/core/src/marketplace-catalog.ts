/**
 * Normalized marketplace catalog (Yandex Market + curated OTC pharmacy).
 *
 * Allergy safety is never inferred from marketplace/feed fields.
 * A product stays draft until a curator sets allergen ids and publishes it.
 */

import { findAllergenById } from './allergen-database';
import {
  DEFAULT_MARKET_MERCHANT_PRIORITY,
  type MarketMerchant,
  type MarketOffer,
} from './market-offers';

export const MARKETPLACE_COLOR_KEYS = ['purple', 'pink', 'accent', 'success', 'warning'] as const;
export type MarketplaceColorKey = (typeof MARKETPLACE_COLOR_KEYS)[number];

export const MARKETPLACE_PRODUCT_KINDS = ['regular', 'medicine'] as const;
export type MarketplaceProductKind = (typeof MARKETPLACE_PRODUCT_KINDS)[number];

export const MARKETPLACE_CATEGORIES = [
  'air',
  'skin',
  'home',
  'food',
  'sos',
  'pharmacy',
] as const;
export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];

export const MARKETPLACE_MODERATION_STATES = ['draft', 'published', 'rejected'] as const;
export type MarketplaceModerationState = (typeof MARKETPLACE_MODERATION_STATES)[number];

export const MARKETPLACE_PROVIDERS = ['yandex_market', 'pharmacy'] as const;
export type MarketplaceProvider = (typeof MARKETPLACE_PROVIDERS)[number];

export const MARKETPLACE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const MEDICINE_CONTRAINDICATION_DISCLAIMER =
  'Имеются противопоказания. Необходимо ознакомиться с инструкцией и проконсультироваться со специалистом.';

const PRESCRIPTION_MARKERS = [
  'рецептурн',
  'по рецепту',
  'prescription',
  'rx only',
];

export interface MarketplaceOffer {
  merchant: MarketMerchant;
  url: string;
  sku?: string;
  erid?: string;
  priceRub?: number;
  photoUrl?: string;
  refreshedAt?: string;
  inStock?: boolean;
}

export interface MarketplaceProduct {
  id: string;
  title: string;
  why: string;
  imageUrl: string;
  icon: string;
  category: MarketplaceCategory;
  kind: MarketplaceProductKind;
  provider: MarketplaceProvider;
  colorKey: MarketplaceColorKey;
  forAllergenIds: string[];
  containsAllergenIds: string[];
  moderationStatus: MarketplaceModerationState;
  prescriptionOnly: boolean;
  showPrice: boolean;
  priceRub?: number;
  offers: MarketplaceOffer[];
  refreshedAt?: string;
}

export function isMarketplaceCategory(value: string): value is MarketplaceCategory {
  return (MARKETPLACE_CATEGORIES as readonly string[]).includes(value);
}

export function isMarketplaceProductKind(value: string): value is MarketplaceProductKind {
  return (MARKETPLACE_PRODUCT_KINDS as readonly string[]).includes(value);
}

export function looksLikePrescriptionText(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return PRESCRIPTION_MARKERS.some((marker) => normalized.includes(marker));
}

export function marketplaceCategoryLabelRu(category: MarketplaceCategory): string {
  switch (category) {
    case 'air':
      return 'Воздух';
    case 'skin':
      return 'Кожа';
    case 'home':
      return 'Дом';
    case 'food':
      return 'Питание';
    case 'sos':
      return 'SOS';
    case 'pharmacy':
      return 'Аптека';
  }
}

export function allergenIdsToDisplayNames(ids: string[]): string[] {
  return ids.map((id) => findAllergenById(id)?.name ?? id);
}

export function canPublishMarketplaceProduct(product: MarketplaceProduct): {
  canPublish: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (!product.title.trim()) reasons.push('title_required');
  if (!isHttpUrl(product.imageUrl)) reasons.push('image_required');
  if (product.offers.length === 0) reasons.push('offer_required');
  if (product.offers.some((offer) => !isHttpUrl(offer.url))) reasons.push('offer_url_invalid');
  if (product.prescriptionOnly) reasons.push('prescription_forbidden');
  if (product.kind === 'medicine' && product.showPrice) reasons.push('medicine_price_forbidden');
  if (product.kind === 'medicine' && product.provider !== 'pharmacy') {
    reasons.push('medicine_requires_pharmacy_provider');
  }

  return { canPublish: reasons.length === 0, reasons };
}

export function filterMarketplaceProductsForProfile(
  products: MarketplaceProduct[],
  profileAllergenIds: string[],
): MarketplaceProduct[] {
  return products.filter((product) => {
    if (product.moderationStatus !== 'published') return false;
    if (product.prescriptionOnly) return false;

    const containsConflict = product.containsAllergenIds.some((allergenId) =>
      profileAllergenIds.includes(allergenId),
    );
    return !containsConflict;
  });
}

/** Boost cards curated for the active profile; never send allergen ids off-device. */
export function rankMarketplaceProductsForProfile(
  products: MarketplaceProduct[],
  profileAllergenIds: string[],
): MarketplaceProduct[] {
  if (profileAllergenIds.length === 0) return products;
  return [...products].sort((left, right) => {
    const leftHit = left.forAllergenIds.some((id) => profileAllergenIds.includes(id)) ? 1 : 0;
    const rightHit = right.forAllergenIds.some((id) => profileAllergenIds.includes(id)) ? 1 : 0;
    return rightHit - leftHit;
  });
}

export function searchMarketplaceProducts(
  products: MarketplaceProduct[],
  query: string,
): MarketplaceProduct[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return products;

  return products.filter((product) => {
    const haystack = [
      product.title,
      product.why,
      marketplaceCategoryLabelRu(product.category),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function getMarketplacePrimaryOffer(
  product: MarketplaceProduct,
  preferred: MarketMerchant = 'yandex_market',
  priority: readonly MarketMerchant[] = DEFAULT_MARKET_MERCHANT_PRIORITY,
): MarketplaceOffer | undefined {
  if (product.offers.length === 0) return undefined;

  const preferredHit = product.offers.find((offer) => offer.merchant === preferred);
  if (preferredHit) return preferredHit;

  for (const merchant of priority) {
    const hit = product.offers.find((offer) => offer.merchant === merchant);
    if (hit) return hit;
  }
  return product.offers[0];
}

export interface MarketplaceCatalogCard {
  id: string;
  title: string;
  why: string;
  icon: string;
  tag: string;
  colorKey: MarketplaceColorKey;
  forAllergens: string[];
  containsAllergens: string[];
  affiliateUrl?: string;
  offers?: MarketOffer[];
  imageUrl?: string;
  kind?: MarketplaceProductKind;
  category?: MarketplaceCategory;
  priceRub?: number;
  showPrice?: boolean;
}

export function toCatalogProduct(product: MarketplaceProduct): MarketplaceCatalogCard {
  const offers: MarketOffer[] = product.offers.map((offer) => ({
    merchant: offer.merchant,
    url: offer.url,
    sku: offer.sku,
    erid: offer.erid,
    priceRub: product.showPrice ? offer.priceRub ?? product.priceRub : undefined,
    photoUrl: offer.photoUrl ?? product.imageUrl,
    refreshedAt: offer.refreshedAt ?? product.refreshedAt,
  }));

  return {
    id: product.id,
    title: product.title,
    why: product.why,
    icon: product.icon,
    tag: marketplaceCategoryLabelRu(product.category),
    colorKey: product.colorKey,
    forAllergens: allergenIdsToDisplayNames(product.forAllergenIds),
    containsAllergens: allergenIdsToDisplayNames(product.containsAllergenIds),
    affiliateUrl: offers[0]?.url,
    offers,
    imageUrl: product.imageUrl,
    kind: product.kind,
    category: product.category,
    priceRub: product.showPrice ? product.priceRub : undefined,
    showPrice: product.showPrice,
  };
}

export function publishedMarketplaceSeed(): MarketplaceProduct[] {
  return MARKETPLACE_SEED_PRODUCTS.filter(
    (product) =>
      product.moderationStatus === 'published' &&
      !product.prescriptionOnly &&
      canPublishMarketplaceProduct(product).canPublish,
  );
}

export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function yandexOffer(query: string, extras: Partial<MarketplaceOffer> = {}): MarketplaceOffer {
  return {
    merchant: 'yandex_market',
    url: `https://market.yandex.ru/search?text=${encodeURIComponent(query)}`,
    ...extras,
  };
}

function pharmacyOffer(query: string, extras: Partial<MarketplaceOffer> = {}): MarketplaceOffer {
  return {
    merchant: 'pharmacy',
    url: `https://zdravcity.ru/search/?q=${encodeURIComponent(query)}`,
    ...extras,
  };
}

const PHOTO = {
  airPurifier:
    'https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=640&h=640&q=80',
  cream:
    'https://images.unsplash.com/photo-1556228720-195a69e2dbae?auto=format&fit=crop&w=640&h=640&q=80',
  bedding:
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=640&h=640&q=80',
  oatMilk:
    'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=640&h=640&q=80',
  spread:
    'https://images.unsplash.com/photo-1628088062854-6ae16c1593ea?auto=format&fit=crop&w=640&h=640&q=80',
  firstAid:
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=640&h=640&q=80',
  nasal:
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=640&h=640&q=80',
  humidifier:
    'https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?auto=format&fit=crop&w=640&h=640&q=80',
  detergent:
    'https://images.unsplash.com/photo-1615485290382-441e4d049cbd?auto=format&fit=crop&w=640&h=640&q=80',
  pills:
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=640&h=640&q=80',
  saline:
    'https://images.unsplash.com/photo-1615486511484-90e29e1c2d0f?auto=format&fit=crop&w=640&h=640&q=80',
} as const;

export const MARKETPLACE_SEED_PRODUCTS: MarketplaceProduct[] = [
  {
    id: 'air-purifier',
    title: 'Очиститель воздуха HEPA',
    why: 'Снижает концентрацию пыльцы и аллергенов в воздухе',
    imageUrl: PHOTO.airPurifier,
    icon: 'cloudy',
    category: 'air',
    kind: 'regular',
    provider: 'yandex_market',
    colorKey: 'purple',
    forAllergenIds: ['birch-pollen', 'ragweed-pollen', 'dust-mites', 'house-dust'],
    containsAllergenIds: [],
    moderationStatus: 'published',
    prescriptionOnly: false,
    showPrice: true,
    priceRub: 12990,
    offers: [yandexOffer('очиститель воздуха HEPA', { priceRub: 12990, photoUrl: PHOTO.airPurifier })],
  },
  {
    id: 'hypo-cream',
    title: 'Гипоаллергенный крем',
    why: 'Без отдушек — для чувствительной кожи',
    imageUrl: PHOTO.cream,
    icon: 'hand-left',
    category: 'skin',
    kind: 'regular',
    provider: 'yandex_market',
    colorKey: 'pink',
    forAllergenIds: ['milk', 'latex'],
    containsAllergenIds: ['milk', 'soy'],
    moderationStatus: 'published',
    prescriptionOnly: false,
    showPrice: true,
    priceRub: 890,
    offers: [yandexOffer('гипоаллергенный крем без отдушек', { priceRub: 890, photoUrl: PHOTO.cream })],
  },
  {
    id: 'bed-covers',
    title: 'Чехлы anti-dust mite',
    why: 'Защита матраса и подушек от домашних клещей',
    imageUrl: PHOTO.bedding,
    icon: 'bed',
    category: 'home',
    kind: 'regular',
    provider: 'yandex_market',
    colorKey: 'accent',
    forAllergenIds: ['dust-mites', 'house-dust'],
    containsAllergenIds: [],
    moderationStatus: 'published',
    prescriptionOnly: false,
    showPrice: true,
    priceRub: 2490,
    offers: [yandexOffer('чехол anti dust mite матрас', { priceRub: 2490, photoUrl: PHOTO.bedding })],
  },
  {
    id: 'oat-milk',
    title: 'Овсяное молоко без глютена',
    why: 'Альтернатива коровьему молоку',
    imageUrl: PHOTO.oatMilk,
    icon: 'nutrition',
    category: 'food',
    kind: 'regular',
    provider: 'yandex_market',
    colorKey: 'success',
    forAllergenIds: ['milk'],
    containsAllergenIds: ['milk', 'tree-nuts'],
    moderationStatus: 'published',
    prescriptionOnly: false,
    showPrice: true,
    priceRub: 189,
    offers: [yandexOffer('овсяное молоко без глютена', { priceRub: 189, photoUrl: PHOTO.oatMilk })],
  },
  {
    id: 'sunflower-spread',
    title: 'Паста без арахиса',
    why: 'Без орехов и арахиса',
    imageUrl: PHOTO.spread,
    icon: 'fast-food',
    category: 'food',
    kind: 'regular',
    provider: 'yandex_market',
    colorKey: 'warning',
    forAllergenIds: ['peanut', 'tree-nuts'],
    containsAllergenIds: ['peanut', 'tree-nuts', 'soy'],
    moderationStatus: 'published',
    prescriptionOnly: false,
    showPrice: true,
    priceRub: 259,
    offers: [yandexOffer('подсолнечная паста без арахиса', { priceRub: 259, photoUrl: PHOTO.spread })],
  },
  {
    id: 'epipen-case',
    title: 'Чехол для автоинжектора',
    why: 'Удобное хранение экстренного препарата',
    imageUrl: PHOTO.firstAid,
    icon: 'medkit',
    category: 'sos',
    kind: 'regular',
    provider: 'yandex_market',
    colorKey: 'purple',
    forAllergenIds: [],
    containsAllergenIds: [],
    moderationStatus: 'published',
    prescriptionOnly: false,
    showPrice: true,
    priceRub: 1490,
    offers: [yandexOffer('чехол для автоинжектора эпинефрин', { priceRub: 1490, photoUrl: PHOTO.firstAid })],
  },
  {
    id: 'nasal-rinse',
    title: 'Назальный ирригатор',
    why: 'Промывание носа при поллинозе и рините',
    imageUrl: PHOTO.nasal,
    icon: 'water',
    category: 'air',
    kind: 'regular',
    provider: 'yandex_market',
    colorKey: 'accent',
    forAllergenIds: ['birch-pollen', 'ragweed-pollen', 'grass-pollen'],
    containsAllergenIds: [],
    moderationStatus: 'published',
    prescriptionOnly: false,
    showPrice: true,
    priceRub: 2190,
    offers: [yandexOffer('назальный ирригатор для промывания носа', { priceRub: 2190, photoUrl: PHOTO.nasal })],
  },
  {
    id: 'humidifier',
    title: 'Увлажнитель воздуха',
    why: 'Поддерживает комфортную влажность в сезон отопления',
    imageUrl: PHOTO.humidifier,
    icon: 'water',
    category: 'air',
    kind: 'regular',
    provider: 'yandex_market',
    colorKey: 'purple',
    forAllergenIds: ['house-dust', 'dust-mites'],
    containsAllergenIds: [],
    moderationStatus: 'published',
    prescriptionOnly: false,
    showPrice: true,
    priceRub: 3990,
    offers: [yandexOffer('увлажнитель воздуха для дома', { priceRub: 3990, photoUrl: PHOTO.humidifier })],
  },
  {
    id: 'hypo-detergent',
    title: 'Гипоаллергенный стиральный порошок',
    why: 'Без отдушек и красителей для чувствительной кожи',
    imageUrl: PHOTO.detergent,
    icon: 'shirt',
    category: 'home',
    kind: 'regular',
    provider: 'yandex_market',
    colorKey: 'accent',
    forAllergenIds: ['latex', 'house-dust'],
    containsAllergenIds: [],
    moderationStatus: 'published',
    prescriptionOnly: false,
    showPrice: true,
    priceRub: 649,
    offers: [yandexOffer('гипоаллергенный стиральный порошок без отдушек', { priceRub: 649, photoUrl: PHOTO.detergent })],
  },
  {
    id: 'cetirizine-otc',
    title: 'Цетиризин 10 мг',
    why: 'Безрецептурный антигистаминный препарат. Не является персональной рекомендацией.',
    imageUrl: PHOTO.pills,
    icon: 'medkit',
    category: 'pharmacy',
    kind: 'medicine',
    provider: 'pharmacy',
    colorKey: 'warning',
    forAllergenIds: ['birch-pollen', 'ragweed-pollen', 'grass-pollen', 'dust-mites'],
    containsAllergenIds: [],
    moderationStatus: 'published',
    prescriptionOnly: false,
    showPrice: false,
    offers: [pharmacyOffer('цетиризин 10 мг', { photoUrl: PHOTO.pills })],
  },
  {
    id: 'loratadine-otc',
    title: 'Лоратадин 10 мг',
    why: 'Безрецептурный антигистаминный препарат. Не является персональной рекомендацией.',
    imageUrl: PHOTO.pills,
    icon: 'medkit',
    category: 'pharmacy',
    kind: 'medicine',
    provider: 'pharmacy',
    colorKey: 'warning',
    forAllergenIds: ['birch-pollen', 'ragweed-pollen', 'cat-dander', 'dog-dander'],
    containsAllergenIds: [],
    moderationStatus: 'published',
    prescriptionOnly: false,
    showPrice: false,
    offers: [pharmacyOffer('лоратадин 10 мг', { photoUrl: PHOTO.pills })],
  },
  {
    id: 'cromoglicic-spray',
    title: 'Кромоглициевая кислота спрей',
    why: 'Безрецептурное средство для носа. Перед применением ознакомьтесь с инструкцией.',
    imageUrl: PHOTO.saline,
    icon: 'water',
    category: 'pharmacy',
    kind: 'medicine',
    provider: 'pharmacy',
    colorKey: 'accent',
    forAllergenIds: ['birch-pollen', 'grass-pollen', 'ragweed-pollen'],
    containsAllergenIds: [],
    moderationStatus: 'published',
    prescriptionOnly: false,
    showPrice: false,
    offers: [pharmacyOffer('кромоглициевая кислота спрей назальный', { photoUrl: PHOTO.saline })],
  },
  {
    id: 'saline-nasal',
    title: 'Изотонический раствор для носа',
    why: 'Безрецептурное средство для промывания носа. Не заменяет назначение врача.',
    imageUrl: PHOTO.saline,
    icon: 'water',
    category: 'pharmacy',
    kind: 'medicine',
    provider: 'pharmacy',
    colorKey: 'accent',
    forAllergenIds: ['birch-pollen', 'grass-pollen', 'house-dust'],
    containsAllergenIds: [],
    moderationStatus: 'published',
    prescriptionOnly: false,
    showPrice: false,
    offers: [pharmacyOffer('изотонический раствор для промывания носа', { photoUrl: PHOTO.saline })],
  },
];
