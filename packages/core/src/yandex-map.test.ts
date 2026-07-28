import { describe, expect, it } from 'vitest';
import { CATALOG_PLACES } from './catalog';
import {
  buildLocationMapUrl,
  buildPlacesMapUrl,
  buildPollenRiskMapUrl,
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

  it('centers the pollen basemap on the user location', () => {
    const url = buildLocationMapUrl(59.93, 30.32);

    expect(url).toContain('ll=30.32%2C59.93');
    expect(url).toContain('pt=30.32%2C59.93%2Cpm2blm');
  });

  it('adds color-coded pollen risk samples without traffic layers', () => {
    const url = buildPollenRiskMapUrl({
      center: { latitude: 55.75, longitude: 37.62 },
      points: [
        { latitude: 55.9, longitude: 37.62, level: 'low' },
        { latitude: 55.6, longitude: 37.62, level: 'high' },
      ],
    });

    expect(url).toContain('pm2gnm');
    expect(url).toContain('pm2rdm');
    expect(url).not.toContain('traffic');
  });

  it('maps place levels to marker colors', () => {
    expect(getPlaceMarkerStyle('high')).toBe('pm2grm');
    expect(getPlaceMarkerStyle('medium')).toBe('pm2orgm');
    expect(getPlaceMarkerStyle('low')).toBe('pm2rdm');
  });
});
