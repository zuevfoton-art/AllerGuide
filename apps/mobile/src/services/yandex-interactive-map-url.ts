import { getApiBaseUrl } from '@/src/services/api-client';
import type { GoogleMapMarker } from '@/src/components/google-pollen-map.types';

export function buildYandexInteractiveEmbedUrl(options: {
  latitude: number;
  longitude: number;
  zoom: number;
  markers: GoogleMapMarker[];
  selectedMarkerId?: string | null;
}): string | null {
  const base = getApiBaseUrl().replace(/\/$/, '');
  if (!base) return null;

  const params = new URLSearchParams({
    lat: String(options.latitude),
    lon: String(options.longitude),
    zoom: String(options.zoom),
  });
  if (options.selectedMarkerId) params.set('selectedId', options.selectedMarkerId);
  if (options.markers.length > 0) {
    params.set(
      'markers',
      JSON.stringify(
        options.markers.map((marker) => ({
          id: marker.id,
          latitude: marker.latitude,
          longitude: marker.longitude,
          title: marker.title,
          color: marker.color,
          kind: marker.kind,
        })),
      ),
    );
  }
  return `${base}/api/maps/yandex-interactive?${params.toString()}`;
}
