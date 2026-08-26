/**
 * Resolve which basemap the Map tab should render.
 *
 * Google is primary when a Maps API key is present and Google map / pollen
 * heatmap flags are on. Yandex interactive is the networked fallback; the
 * static Yandex overview remains the offline-safe last resort.
 */
export type MapBasemapKind = 'google' | 'yandex-interactive' | 'yandex-static';

export type ResolveMapBasemapInput = {
  googleMapsApiKeyPresent: boolean;
  apiBaseUrlPresent: boolean;
  googleMapPrimaryEnabled: boolean;
  googlePollenHeatmapEnabled: boolean;
  yandexInteractiveEnabled: boolean;
};

export function resolveMapBasemap(input: ResolveMapBasemapInput): MapBasemapKind {
  const canUseGoogle =
    input.googleMapsApiKeyPresent &&
    (input.googleMapPrimaryEnabled || input.googlePollenHeatmapEnabled);

  if (canUseGoogle) {
    return 'google';
  }

  if (input.yandexInteractiveEnabled && input.apiBaseUrlPresent) {
    return 'yandex-interactive';
  }

  return 'yandex-static';
}

/**
 * After a native Google MapView fails to load tiles (empty beige canvas),
 * fall back to the networked Yandex embed, then the static overview.
 */
export function resolveRuntimeMapBasemap(
  preferred: MapBasemapKind,
  input: {
    googleFailed: boolean;
    yandexInteractiveEnabled: boolean;
    apiBaseUrlPresent: boolean;
  },
): MapBasemapKind {
  if (preferred !== 'google' || !input.googleFailed) {
    return preferred;
  }

  if (input.yandexInteractiveEnabled && input.apiBaseUrlPresent) {
    return 'yandex-interactive';
  }

  return 'yandex-static';
}
