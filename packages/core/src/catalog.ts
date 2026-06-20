export interface CatalogProduct {
  id: string;
  title: string;
  why: string;
  icon: string;
  tag: string;
  colorKey: 'purple' | 'pink' | 'accent' | 'success' | 'warning';
  /** Helps with these allergen categories */
  forAllergens: string[];
  /** Product may contain these allergens — hidden for allergic users */
  containsAllergens: string[];
}

export interface CatalogPlace {
  id: string;
  title: string;
  note: string;
  level: 'high' | 'medium' | 'low';
  icon: string;
  lat: number;
  lng: number;
  /** Tags like allergen-friendly features */
  tags: string[];
}

export interface EmergencyContact {
  id: number;
  profileId: number;
  name: string;
  phone: string;
  relation: string;
}

export interface ProfileSosData {
  profileId: number;
  notes: string;
}

export const CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: 'air-purifier',
    title: 'Очиститель воздуха HEPA',
    why: 'Снижает концентрацию пыльцы и аллергенов в воздухе',
    icon: 'cloudy',
    tag: 'Воздух',
    colorKey: 'purple',
    forAllergens: ['Пыльца берёзы', 'Пыльца амброзии', 'Пыль клещей', 'Бытовая аллергия'],
    containsAllergens: [],
  },
  {
    id: 'hypo-cream',
    title: 'Гипоаллергенный крем',
    why: 'Без отдушек и лактозы — для чувствительной кожи',
    icon: 'hand-left',
    tag: 'Кожа',
    colorKey: 'pink',
    forAllergens: ['Атопический дерматит', 'Молоко'],
    containsAllergens: ['Молоко', 'Соя'],
  },
  {
    id: 'bed-covers',
    title: 'Чехлы anti-dust mite',
    why: 'Защита матраса и подушек от домашних клещей',
    icon: 'bed',
    tag: 'Дом',
    colorKey: 'accent',
    forAllergens: ['Пыль клещей', 'Бытовая аллергия'],
    containsAllergens: [],
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
  },
  {
    id: 'sunflower-spread',
    title: 'Sunflower spread без арахиса',
    why: 'Паста без орехов и арахиса',
    icon: 'fast-food',
    tag: 'Питание',
    colorKey: 'warning',
    forAllergens: ['Арахис', 'Орехи'],
    containsAllergens: ['Арахис', 'Орехи', 'Соя'],
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
    tags: ['nut-free', 'gluten-free-options'],
  },
  {
    id: 'simple-kitchen',
    title: 'Simple Family Kitchen',
    note: 'Уточняйте состав у официанта, возможен контакт с молоком',
    level: 'medium',
    icon: 'restaurant',
    lat: 55.7512,
    lng: 37.6184,
    tags: ['family', 'customizable'],
  },
  {
    id: 'pharmacy-plus',
    title: 'Pharmacy Plus',
    note: 'Антигистаминные и автоинжекторы, круглосуточно',
    level: 'high',
    icon: 'medkit',
    lat: 55.7601,
    lng: 37.6109,
    tags: ['pharmacy', '24h'],
  },
  {
    id: 'rice-bar',
    title: 'Rice Bar',
    note: 'Блюда на рисовой основе, без глютена и молока в базовом меню',
    level: 'high',
    icon: 'restaurant',
    lat: 55.7489,
    lng: 37.6255,
    tags: ['gluten-free', 'dairy-free'],
  },
];

export function parseProfileAllergens(allergiesJson: string): string[] {
  try {
    const parsed = JSON.parse(allergiesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function filterProductsForProfile(
  products: CatalogProduct[],
  profileAllergens: string[],
): CatalogProduct[] {
  return products.filter((product) => {
    const containsConflict = product.containsAllergens.some((a) => profileAllergens.includes(a));
    if (containsConflict) return false;
    if (product.forAllergens.length === 0) return true;
    return product.forAllergens.some((a) => profileAllergens.includes(a));
  });
}

export function filterPlacesForProfile(
  places: CatalogPlace[],
  profileAllergens: string[],
): CatalogPlace[] {
  if (profileAllergens.length === 0) return places;
  return places.sort((a, b) => {
    const score = (p: CatalogPlace) => (p.level === 'high' ? 2 : p.level === 'medium' ? 1 : 0);
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
