import { describe, expect, it } from 'vitest';
import { resolveMapBasemap } from './map-basemap';

describe('resolveMapBasemap', () => {
  const base = {
    googleMapsApiKeyPresent: false,
    apiBaseUrlPresent: true,
    googleMapPrimaryEnabled: true,
    googlePollenHeatmapEnabled: true,
    yandexInteractiveEnabled: true,
  };

  it('prefers Google when Maps key and Google flags are present (over Yandex interactive)', () => {
    expect(
      resolveMapBasemap({
        ...base,
        googleMapsApiKeyPresent: true,
      }),
    ).toBe('google');
  });

  it('falls back to Yandex interactive when Maps key is missing', () => {
    expect(resolveMapBasemap(base)).toBe('yandex-interactive');
  });

  it('falls back to static Yandex when interactive is off and no Maps key', () => {
    expect(
      resolveMapBasemap({
        ...base,
        yandexInteractiveEnabled: false,
      }),
    ).toBe('yandex-static');
  });

  it('does not use Google without heatmap/primary flags even if key present', () => {
    expect(
      resolveMapBasemap({
        ...base,
        googleMapsApiKeyPresent: true,
        googleMapPrimaryEnabled: false,
        googlePollenHeatmapEnabled: false,
      }),
    ).toBe('yandex-interactive');
  });

  it('uses Google from heatmap-only flag', () => {
    expect(
      resolveMapBasemap({
        ...base,
        googleMapsApiKeyPresent: true,
        googleMapPrimaryEnabled: false,
        googlePollenHeatmapEnabled: true,
        yandexInteractiveEnabled: true,
      }),
    ).toBe('google');
  });
});
