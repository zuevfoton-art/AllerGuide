import type { CatalogPlace } from './catalog';

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

export function buildLocationMapUrl(latitude: number, longitude: number): string {
  return buildYandexMapWidgetUrl({
    center: { latitude, longitude },
    zoom: MOSCOW_PLACE_ZOOM,
    markers: [{ latitude, longitude, style: 'pm2blm' }],
  });
}
