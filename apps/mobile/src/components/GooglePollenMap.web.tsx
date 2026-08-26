import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import {
  buildPollenHeatmapTileUrlTemplate,
  resolvePollenHeatmapTileUrl,
} from '@/src/services/pollen-heatmap-service';
import type { GooglePollenMapProps } from './google-pollen-map.types';

const GOOGLE_TILE_SIZE = 256;
let googleMapsLoader: Promise<void> | null = null;

export function GooglePollenMap({
  latitude,
  longitude,
  zoom,
  mapType,
  tileUrlTemplate: tileUrlTemplateOverride,
  height = 300,
  interactive = true,
  markers = [],
  circles = [],
  polylines = [],
  selectedMarkerId,
  onMarkerPress,
  onRegionChange,
  overlay,
}: GooglePollenMapProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, height), [height, theme]);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const tileOverlayRef = useRef<google.maps.ImageMapType | null>(null);
  const markerRefs = useRef<google.maps.Marker[]>([]);
  const circleRefs = useRef<google.maps.Circle[]>([]);
  const polylineRefs = useRef<google.maps.Polyline[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const onMarkerPressRef = useRef(onMarkerPress);
  onMarkerPressRef.current = onMarkerPress;
  const onRegionChangeRef = useRef(onRegionChange);
  onRegionChangeRef.current = onRegionChange;
  const lastRequestedCenterRef = useRef<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
    if (!apiKey) return undefined;

    void loadGoogleMaps(apiKey).then(() => {
      if (isCancelled || !containerRef.current) return;

      let map = mapRef.current;
      if (!map) {
        map = new google.maps.Map(containerRef.current, {
          center: { lat: latitude, lng: longitude },
          zoom,
          clickableIcons: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          gestureHandling: interactive ? 'auto' : 'none',
        });
        map.addListener('idle', () => {
          const center = mapRef.current?.getCenter();
          if (center) onRegionChangeRef.current?.(center.lat(), center.lng());
        });
      }
      mapRef.current = map;
      // Recenter only when the requested coordinates change; otherwise marker
      // refreshes (e.g. "search this area") would snap the map back.
      const requestedCenter = `${latitude.toFixed(5)}:${longitude.toFixed(5)}:${zoom}`;
      if (lastRequestedCenterRef.current !== requestedCenter) {
        lastRequestedCenterRef.current = requestedCenter;
        map.setCenter({ lat: latitude, lng: longitude });
        map.setZoom(zoom);
      }
      map.setOptions({ gestureHandling: interactive ? 'auto' : 'none' });

      if (tileOverlayRef.current) {
        const existingIndex = map.overlayMapTypes
          .getArray()
          .indexOf(tileOverlayRef.current);
        if (existingIndex >= 0) map.overlayMapTypes.removeAt(existingIndex);
        tileOverlayRef.current = null;
      }

      const tileUrlTemplate =
        tileUrlTemplateOverride ??
        (mapType ? buildPollenHeatmapTileUrlTemplate(mapType) : null);
      if (tileUrlTemplate) {
        const tileOverlay = new google.maps.ImageMapType({
          getTileUrl: (coordinate, tileZoom) =>
            resolvePollenHeatmapTileUrl(
              tileUrlTemplate,
              tileZoom,
              coordinate.x,
              coordinate.y,
            ),
          tileSize: new google.maps.Size(GOOGLE_TILE_SIZE, GOOGLE_TILE_SIZE),
          maxZoom: 16,
          minZoom: 0,
          name: mapType ?? 'tiles',
          opacity: 0.8,
        });
        map.overlayMapTypes.insertAt(0, tileOverlay);
        tileOverlayRef.current = tileOverlay;
      }

      if (!userMarkerRef.current) {
        userMarkerRef.current = new google.maps.Marker({
          map,
          position: { lat: latitude, lng: longitude },
        });
      } else {
        userMarkerRef.current.setPosition({ lat: latitude, lng: longitude });
      }

      for (const marker of markerRefs.current) marker.setMap(null);
      markerRefs.current = markers.map((item) => {
        const fill = item.color ?? '#2563EB';
        const symbolPath = google.maps.SymbolPath?.CIRCLE;
        const marker = new google.maps.Marker({
          map,
          position: { lat: item.latitude, lng: item.longitude },
          title: item.title,
          opacity: item.id === selectedMarkerId ? 1 : 0.85,
          icon: symbolPath
            ? {
                path: symbolPath,
                scale: item.kind?.startsWith('adair') ? 11 : 8,
                fillColor: fill,
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              }
            : undefined,
        });
        marker.addListener('click', () => onMarkerPressRef.current?.(item.id));
        return marker;
      });

      for (const circle of circleRefs.current) circle.setMap(null);
      circleRefs.current = circles.map(
        (item) =>
          new google.maps.Circle({
            map,
            center: { lat: item.latitude, lng: item.longitude },
            radius: item.radiusM,
            fillColor: item.color,
            fillOpacity: item.opacity,
            strokeColor: item.color,
            strokeOpacity: item.strokeOpacity ?? item.opacity * 0.85,
            strokeWeight: 1,
            clickable: false,
          }),
      );

      for (const line of polylineRefs.current) line.setMap(null);
      polylineRefs.current = polylines.map(
        (item) =>
          new google.maps.Polyline({
            map,
            path: item.path.map((point) => ({
              lat: point.latitude,
              lng: point.longitude,
            })),
            strokeColor: item.color,
            strokeOpacity: item.opacity ?? 0.55,
            strokeWeight: item.width ?? 3,
            clickable: false,
          }),
      );
    });

    return () => {
      isCancelled = true;
    };
  }, [
    circles,
    interactive,
    latitude,
    longitude,
    mapType,
    markers,
    polylines,
    selectedMarkerId,
    tileUrlTemplateOverride,
    zoom,
  ]);

  return (
    <View style={styles.wrap}>
      <div ref={containerRef} style={styles.map as React.CSSProperties} />
      {overlay ? (
        <View pointerEvents="none" style={styles.overlay}>
          {overlay}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Loads the Maps JavaScript API through the official `@googlemaps/js-api-loader`
 * (dynamic library import). Legacy `google.maps.Marker` lives in the `marker`
 * library, everything else the component touches lives in `maps`.
 */
function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof google !== 'undefined' && google.maps?.Map && google.maps.Marker) {
    return Promise.resolve();
  }
  if (googleMapsLoader) return googleMapsLoader;

  setOptions({ key: apiKey });
  googleMapsLoader = Promise.all([importLibrary('maps'), importLibrary('marker')])
    .then(() => undefined)
    .catch((error: unknown) => {
      googleMapsLoader = null;
      throw error instanceof Error
        ? error
        : new Error('Unable to load Google Maps JavaScript API');
    });

  return googleMapsLoader;
}

function createStyles({ colors }: AppTheme, height: number) {
  return StyleSheet.create({
    wrap: {
      height,
      overflow: 'hidden',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.mapRoad,
      backgroundColor: colors.mapLand,
    },
    map: { width: '100%', height: '100%' },
    overlay: {
      ...StyleSheet.absoluteFillObject,
    },
  });
}
