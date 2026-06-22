import { describe, expect, it } from 'vitest';
import { CATALOG_PLACES } from './catalog';
import {
  buildPlacesMapUrl,
  buildYandexMapWidgetUrl,
  getPlaceMarkerStyle,
  MOSCOW_REGION_CENTER,
  MOSCOW_REGION_ZOOM,
} from './yandex-map';

describe('yandex-map', () => {
  it('builds widget URL for Moscow region', () => {
    const url = buildYandexMapWidgetUrl({});
    expect(url).toContain('yandex.ru/map-widget/v1/');
    expect(url).toContain(`ll=${MOSCOW_REGION_CENTER.longitude}%2C${MOSCOW_REGION_CENTER.latitude}`);
    expect(url).toContain(`z=${MOSCOW_REGION_ZOOM}`);
    expect(url).toContain('lang=ru_RU');
  });

  it('adds markers for places', () => {
    const url = buildPlacesMapUrl(CATALOG_PLACES);
    expect(url).toContain('pt=');
    expect(url).toContain('pm2grm');
  });

  it('centers on selected place', () => {
    const place = CATALOG_PLACES[0];
    const url = buildPlacesMapUrl(CATALOG_PLACES, place.id);
    expect(url).toContain(`ll=${place.lng}%2C${place.lat}`);
    expect(url).toContain('z=13');
  });

  it('maps place levels to marker colors', () => {
    expect(getPlaceMarkerStyle('high')).toBe('pm2grm');
    expect(getPlaceMarkerStyle('medium')).toBe('pm2orgm');
    expect(getPlaceMarkerStyle('low')).toBe('pm2rdm');
  });
});
