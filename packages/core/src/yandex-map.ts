import type { CatalogPlace } from './catalog';
import type { AdairClinic } from './adair-catalog';

/** Центр карты: Москва и ближайшая Московская область. */
export const MOSCOW_REGION_CENTER = {
  latitude: 55.75,
  longitude: 37.5,
} as const;

/** Масштаб, охватывающий Москву и Московскую область. */
export const MOSCOW_REGION_ZOOM = 9;

/** Увеличенный масштаб при выборе конкретного места. */
export const MOSCOW_PLACE_ZOOM = 13;

export type YandexMapMarker = {
  latitude: number;
  longitude: number;
  style?: string;
};

const PLACE_LEVEL_MARKER_STYLE: Record<CatalogPlace['level'], string> = {
  high: 'pm2grm',
  medium: 'pm2orgm',
  low: 'pm2rdm',
};

export function getPlaceMarkerStyle(level: CatalogPlace['level']): string {
  return PLACE_LEVEL_MARKER_STYLE[level];
}

export function buildYandexMapWidgetUrl(options: {
  center?: { latitude: number; longitude: number };
  zoom?: number;
  markers?: YandexMapMarker[];
}): string {
  const center = options.center ?? MOSCOW_REGION_CENTER;
  const zoom = options.zoom ?? MOSCOW_REGION_ZOOM;
  const params = new URLSearchParams({
    ll: `${center.longitude},${center.latitude}`,
    z: String(zoom),
    l: 'map',
    lang: 'ru_RU',
  });

  if (options.markers?.length) {
    const points = options.markers
      .map((marker) => `${marker.longitude},${marker.latitude},${marker.style ?? 'pm2blm'}`)
      .join('~');
    params.set('pt', points);
  }

  return `https://yandex.ru/map-widget/v1/?${params.toString()}`;
}

export function buildPlacesMapUrl(
  places: CatalogPlace[],
  selectedId?: string | null,
): string {
  const selected = selectedId ? places.find((place) => place.id === selectedId) : null;

  return buildYandexMapWidgetUrl({
    center: selected
      ? { latitude: selected.lat, longitude: selected.lng }
      : MOSCOW_REGION_CENTER,
    zoom: selected ? MOSCOW_PLACE_ZOOM : MOSCOW_REGION_ZOOM,
    markers: places.map((place) => ({
      latitude: place.lat,
      longitude: place.lng,
      style: getPlaceMarkerStyle(place.level),
    })),
  });
}

// ─── Birch pollen layer ───────────────────────────────────────────────────────

export type BirchPollenHotspot = {
  lat: number;
  lng: number;
  label: string;
  /** high = красный маркер, medium = оранжевый */
  intensity: 'high' | 'medium';
};

/**
 * Известные очаги берёзы (парки и лесопарки) по регионам.
 * Используются как визуальный слой предупреждения о пылении.
 */
export const BIRCH_HOTSPOTS: Record<string, BirchPollenHotspot[]> = {
  moscow: [
    { lat: 55.886, lng: 37.814, label: 'Лосиный остров', intensity: 'high' },
    { lat: 55.777, lng: 37.799, label: 'Измайловский парк', intensity: 'high' },
    { lat: 55.777, lng: 37.402, label: 'Серебряный Бор', intensity: 'high' },
    { lat: 55.596, lng: 37.567, label: 'Битцевский лес', intensity: 'high' },
    { lat: 55.794, lng: 37.679, label: 'Сокольники', intensity: 'medium' },
    { lat: 55.812, lng: 37.565, label: 'Тимирязевский парк', intensity: 'medium' },
    { lat: 55.834, lng: 37.601, label: 'Ботанический сад РАН', intensity: 'medium' },
    { lat: 55.759, lng: 37.823, label: 'Терлецкий парк', intensity: 'medium' },
  ],
  'saint-petersburg': [
    { lat: 59.974, lng: 30.300, label: 'Удельный парк', intensity: 'high' },
    { lat: 59.980, lng: 30.226, label: 'ЦПКиО им. Кирова', intensity: 'high' },
    { lat: 59.850, lng: 30.262, label: 'Пушкин (Царское село)', intensity: 'medium' },
    { lat: 59.934, lng: 30.400, label: 'Московский парк Победы', intensity: 'medium' },
  ],
  krasnodar: [
    { lat: 45.043, lng: 38.976, label: 'Краснодарский парк', intensity: 'medium' },
    { lat: 45.022, lng: 38.957, label: 'Парк «Солнечный остров»', intensity: 'medium' },
  ],
  novosibirsk: [
    { lat: 55.017, lng: 82.935, label: 'Академгородок', intensity: 'high' },
    { lat: 55.041, lng: 82.891, label: 'Заельцовский парк', intensity: 'high' },
    { lat: 55.043, lng: 82.965, label: 'Ботсад СО РАН', intensity: 'medium' },
  ],
  ekaterinburg: [
    { lat: 56.876, lng: 60.631, label: 'Шарташский лесопарк', intensity: 'high' },
    { lat: 56.843, lng: 60.601, label: 'Ботанический сад УрО РАН', intensity: 'medium' },
    { lat: 56.856, lng: 60.578, label: 'Парк им. Маяковского', intensity: 'medium' },
  ],
};

/**
 * Строит URL Яндекс-карты со слоем берёзовой пыльцы:
 * красные маркеры — высокая концентрация, оранжевые — средняя.
 */
export function buildBirchPollenMapUrl(
  regionId = 'moscow',
  regionCenter?: { latitude: number; longitude: number },
  zoom?: number,
): string {
  const hotspots = BIRCH_HOTSPOTS[regionId] ?? BIRCH_HOTSPOTS['moscow'];
  return buildYandexMapWidgetUrl({
    center: regionCenter ?? MOSCOW_REGION_CENTER,
    zoom: zoom ?? MOSCOW_REGION_ZOOM,
    markers: hotspots.map((spot) => ({
      latitude: spot.lat,
      longitude: spot.lng,
      style: spot.intensity === 'high' ? 'pm2rdm' : 'pm2orgm',
    })),
  });
}

// ─── ADAIR clinics layer ──────────────────────────────────────────────────────

/**
 * Строит URL Яндекс-карты с маркерами клиник АДАИР.
 * НККЦ — красный маркер, остальные — синие.
 */
export function buildAdairClinicsMapUrl(clinics: AdairClinic[]): string {
  if (!clinics.length) {
    return buildYandexMapWidgetUrl({ center: MOSCOW_REGION_CENTER, zoom: 4 });
  }

  const moscowClinics = clinics.filter((c) => c.city === 'Москва');
  const center =
    moscowClinics.length > 0
      ? { latitude: 55.75, longitude: 37.57 }
      : { latitude: clinics[0].latitude, longitude: clinics[0].longitude };

  const zoom = clinics.length <= 2 ? 10 : clinics.every((c) => c.city === clinics[0].city) ? 10 : 3;

  return buildYandexMapWidgetUrl({
    center,
    zoom,
    markers: clinics.map((clinic) => ({
      latitude: clinic.latitude,
      longitude: clinic.longitude,
      style: clinic.isNkcc ? 'pm2rdm' : 'pm2blm',
    })),
  });
}
