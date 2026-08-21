import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import type { GoogleMapMarker } from '@/src/components/google-pollen-map.types';
import { buildYandexInteractiveEmbedUrl } from '@/src/services/yandex-interactive-map-url';

export { buildYandexInteractiveEmbedUrl } from '@/src/services/yandex-interactive-map-url';

export type YandexInteractiveMapProps = {
  latitude: number;
  longitude: number;
  zoom: number;
  height?: number;
  markers?: GoogleMapMarker[];
  selectedMarkerId?: string | null;
  onMarkerPress?: (markerId: string) => void;
  onRegionChange?: (latitude: number, longitude: number) => void;
  overlay?: ReactNode;
};

/**
 * Interactive Yandex basemap via API-hosted JS embed (key stays server-side).
 * Requires `EXPO_PUBLIC_YANDEX_MAP_INTERACTIVE=true` and API
 * `YANDEX_MAPS_INTERACTIVE_ENABLED` + `YANDEX_MAPS_JS_API_KEY`.
 */
export function YandexInteractiveMap({
  latitude,
  longitude,
  zoom,
  height = 300,
  markers = [],
  selectedMarkerId,
  onMarkerPress,
  onRegionChange,
  overlay,
}: YandexInteractiveMapProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, height), [theme, height]);
  const onMarkerPressRef = useRef(onMarkerPress);
  onMarkerPressRef.current = onMarkerPress;
  const onRegionChangeRef = useRef(onRegionChange);
  onRegionChangeRef.current = onRegionChange;

  const src = useMemo(
    () =>
      buildYandexInteractiveEmbedUrl({
        latitude,
        longitude,
        zoom,
        markers,
        selectedMarkerId,
      }),
    [latitude, longitude, markers, selectedMarkerId, zoom],
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
    const onMessage = (event: MessageEvent) => {
      handleBridgeMessage(
        String(event.data ?? ''),
        onMarkerPressRef.current,
        onRegionChangeRef.current,
      );
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (!src) {
    return <View style={styles.wrap} testID="yandex-interactive-map-missing" />;
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrap} testID="yandex-interactive-map">
        <iframe
          src={src}
          title="Yandex Interactive Map"
          style={StyleSheet.flatten(styles.iframe) as object}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        {overlay ? (
          <View pointerEvents="none" style={styles.overlay}>
            {overlay}
          </View>
        ) : null}
      </View>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { WebView } = require('react-native-webview') as typeof import('react-native-webview');

  return (
    <View style={styles.wrap} testID="yandex-interactive-map">
      <WebView
        source={{ uri: src }}
        style={styles.webview}
        originWhitelist={['https://*', 'http://*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(event) => {
          handleBridgeMessage(
            event.nativeEvent.data,
            onMarkerPressRef.current,
            onRegionChangeRef.current,
          );
        }}
      />
      {overlay ? (
        <View pointerEvents="none" style={styles.overlay}>
          {overlay}
        </View>
      ) : null}
    </View>
  );
}

function handleBridgeMessage(
  raw: string,
  onMarkerPress?: ((markerId: string) => void) | null,
  onRegionChange?: ((latitude: number, longitude: number) => void) | null,
) {
  try {
    const parsed = JSON.parse(raw) as {
      source?: string;
      type?: string;
      data?: { id?: string; latitude?: number; longitude?: number };
    };
    if (parsed.source !== 'allerguide-yandex-map') return;
    if (parsed.type === 'marker_press' && parsed.data?.id) {
      onMarkerPress?.(parsed.data.id);
    }
    if (
      parsed.type === 'region_change' &&
      typeof parsed.data?.latitude === 'number' &&
      typeof parsed.data?.longitude === 'number'
    ) {
      onRegionChange?.(parsed.data.latitude, parsed.data.longitude);
    }
  } catch {
    // ignore non-JSON
  }
}

function createStyles({ colors }: AppTheme, height: number) {
  return StyleSheet.create({
    wrap: {
      height,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.mapRoad,
      backgroundColor: colors.mapLand,
    },
    webview: { flex: 1, backgroundColor: 'transparent' },
    iframe: {
      width: '100%',
      height: '100%',
      borderWidth: 0,
    } as object,
    overlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 2,
    },
  });
}
