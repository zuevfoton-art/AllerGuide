import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import {
  buildPollenHeatmapTileUrlTemplate,
  resolvePollenHeatmapTileUrl,
} from '@/src/services/pollen-heatmap-service';
import type { GooglePollenMapProps } from './google-pollen-map.types';

const GOOGLE_MAPS_SCRIPT_ID = 'allerguide-google-maps';
const GOOGLE_TILE_SIZE = 256;
let googleMapsLoader: Promise<void> | null = null;

export function GooglePollenMap({
  latitude,
  longitude,
  zoom,
  mapType,
  height = 300,
  interactive = true,
  overlay,
}: GooglePollenMapProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, height), [height, theme]);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const tileOverlayRef = useRef<google.maps.ImageMapType | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
    if (!apiKey) return undefined;

    void loadGoogleMaps(apiKey).then(() => {
      if (isCancelled || !containerRef.current) return;

      const map =
        mapRef.current ??
        new google.maps.Map(containerRef.current, {
          center: { lat: latitude, lng: longitude },
          zoom,
          clickableIcons: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          gestureHandling: interactive ? 'auto' : 'none',
        });
      mapRef.current = map;
      map.setCenter({ lat: latitude, lng: longitude });
      map.setZoom(zoom);
      map.setOptions({ gestureHandling: interactive ? 'auto' : 'none' });

      if (tileOverlayRef.current) {
        const existingIndex = map.overlayMapTypes
          .getArray()
          .indexOf(tileOverlayRef.current);
        if (existingIndex >= 0) map.overlayMapTypes.removeAt(existingIndex);
      }

      const tileUrlTemplate = buildPollenHeatmapTileUrlTemplate(mapType);
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
        name: mapType,
        opacity: 0.8,
      });
      map.overlayMapTypes.insertAt(0, tileOverlay);
      tileOverlayRef.current = tileOverlay;
    });

    return () => {
      isCancelled = true;
    };
  }, [interactive, latitude, longitude, mapType, zoom]);

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

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof google !== 'undefined' && google.maps) return Promise.resolve();
  if (googleMapsLoader) return googleMapsLoader;

  googleMapsLoader = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(
      GOOGLE_MAPS_SCRIPT_ID,
    ) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement('script');

    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => {
        googleMapsLoader = null;
        reject(new Error('Unable to load Google Maps JavaScript API'));
      },
      { once: true },
    );

    if (!existingScript) {
      script.id = GOOGLE_MAPS_SCRIPT_ID;
      script.async = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
      document.head.appendChild(script);
    }
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
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    map: { width: '100%', height: '100%' },
    overlay: {
      ...StyleSheet.absoluteFillObject,
    },
  });
}
