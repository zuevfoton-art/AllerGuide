import { parseAllergies } from './profile-allergens';
import {
  DEFAULT_MARKET_MERCHANT_PRIORITY,
  type MarketMerchant,
  type MarketOffer,
} from './market-offers';

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

function yandexSearch(query: string): MarketOffer {
  return {
    merchant: 'yandex_market',
    url: `https://market.yandex.ru/search?text=${encodeURIComponent(query)}`,
  };
}

export const CATALOG_PRODUCTS: CatalogProduct[] = [
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
      yandexSearch('очиститель воздуха HEPA'),
      {
        merchant: 'iherb',
        url: 'https://www.iherb.com/search?kw=hepa+air+purifier',
      },
    ],
  },
  {
    id: 'hypo-cream',
    title: 'Гипоаллергенный крем',
    why: 'Без отдушек — для чувствительной кожи',
    icon: 'hand-left',
    tag: 'Кожа',
    colorKey: 'pink',
    forAllergens: ['Атопический дерматит', 'Молоко'],
    containsAllergens: ['Молоко', 'Соя'],
    offers: [yandexSearch('гипоаллергенный крем без отдушек')],
  },
  {
    id: 'bed-covers',
    title: 'Чехлы anti-dust mite',
    why: 'Защита матраса и подушек от домашних клещей',
    icon: 'bed',
    tag: 'Дом',
    colorKey: 'accent',
    forAllergens: ['Пылевые клещи', 'Бытовая аллергия'],
    containsAllergens: [],
    offers: [yandexSearch('чехол anti dust mite матрас')],
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
    offers: [yandexSearch('овсяное молоко без глютена')],
  },
  {
    id: 'sunflower-spread',
    title: 'Паста без арахиса',
    why: 'Без орехов и арахиса',
    icon: 'fast-food',
    tag: 'Питание',
    colorKey: 'warning',
    forAllergens: ['Арахис', 'Орехи'],
    containsAllergens: ['Арахис', 'Орехи', 'Соя'],
    offers: [yandexSearch('подсолнечная паста без арахиса')],
  },
  {
    id: 'epipen-case',
    title: 'Чехол для автоинжектора',
    why: 'Удобное хранение экстренного препарата',
    icon: 'medkit',
    tag: 'SOS',
    colorKey: 'purple',
    forAllergens: [],
    containsAllergens: [],
    offers: [yandexSearch('чехол для автоинжектора эпинефрин')],
  },
  {
    id: 'nasal-rinse',
    title: 'Назальный ирригатор',
    why: 'Промывание носа при поллинозе и рините',
    icon: 'water',
    tag: 'Воздух',
    colorKey: 'accent',
    forAllergens: ['Пыльца берёзы', 'Пыльца амброзии', 'Пыльца злаков'],
    containsAllergens: [],
    offers: [yandexSearch('назальный ирригатор для промывания носа')],
  },
];

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
