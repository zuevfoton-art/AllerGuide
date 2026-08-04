export type YandexEmbedMarker = {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  color?: string;
};

export function isYandexMapsInteractiveConfigured(): boolean {
  return (
    process.env.YANDEX_MAPS_INTERACTIVE_ENABLED === 'true' &&
    Boolean(process.env.YANDEX_MAPS_JS_API_KEY?.trim())
  );
}

export function getYandexMapsJsApiKey(): string | null {
  const key = process.env.YANDEX_MAPS_JS_API_KEY?.trim();
  return key || null;
}

/**
 * Builds a self-contained HTML page that loads Yandex Maps JS API 2.1
 * (stable WebView path; upgrade to v3 later if needed).
 * The API key stays server-side — never shipped as EXPO_PUBLIC_*.
 */
export function buildYandexInteractiveMapHtml(options: {
  apiKey: string;
  latitude: number;
  longitude: number;
  zoom: number;
  markers: YandexEmbedMarker[];
  selectedId?: string | null;
}): string {
  const payload = JSON.stringify({
    latitude: options.latitude,
    longitude: options.longitude,
    zoom: options.zoom,
    markers: options.markers,
    selectedId: options.selectedId ?? null,
  });

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #e8eef5; }
  </style>
  <script src="https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(options.apiKey)}&lang=ru_RU"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    (function () {
      var cfg = ${payload};
      function post(type, data) {
        var message = JSON.stringify({ source: 'allerguide-yandex-map', type: type, data: data || {} });
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(message);
        }
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(message, '*');
        }
      }
      ymaps.ready(function () {
        var map = new ymaps.Map('map', {
          center: [cfg.latitude, cfg.longitude],
          zoom: cfg.zoom,
          controls: ['zoomControl', 'geolocationControl']
        }, { suppressMapOpenBlock: true });

        map.geoObjects.add(new ymaps.Placemark(
          [cfg.latitude, cfg.longitude],
          { balloonContent: 'Вы здесь' },
          { preset: 'islands#redDotIcon' }
        ));

        (cfg.markers || []).forEach(function (marker) {
          var preset = marker.id === cfg.selectedId
            ? 'islands#blueIcon'
            : 'islands#darkBlueIcon';
          var place = new ymaps.Placemark(
            [marker.latitude, marker.longitude],
            { balloonContent: marker.title || marker.id, hintContent: marker.title || '' },
            { preset: preset }
          );
          place.events.add('click', function () {
            post('marker_press', { id: marker.id });
          });
          map.geoObjects.add(place);
        });

        post('ready', { markerCount: (cfg.markers || []).length });
      });
    })();
  </script>
</body>
</html>`;
}
