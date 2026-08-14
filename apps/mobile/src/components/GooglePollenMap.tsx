import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, {
  Circle,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  UrlTile,
  type Region,
} from 'react-native-maps';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { buildPollenHeatmapTileUrlTemplate } from '@/src/services/pollen-heatmap-service';
import type { GooglePollenMapProps } from './google-pollen-map.types';

const MAP_ANIMATION_DURATION_MS = 300;
const TILE_SIZE = 256;

export function GooglePollenMap({
  latitude,
  longitude,
  zoom,
  mapType,
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
  const mapRef = useRef<MapView>(null);
  const onRegionChangeRef = useRef(onRegionChange);
  onRegionChangeRef.current = onRegionChange;
  const region = useMemo(
    () => buildRegion(latitude, longitude, zoom),
    [latitude, longitude, zoom],
  );
  const tileUrlTemplate = useMemo(
    () => (mapType ? buildPollenHeatmapTileUrlTemplate(mapType) : null),
    [mapType],
  );

  useEffect(() => {
    mapRef.current?.animateToRegion(region, MAP_ANIMATION_DURATION_MS);
  }, [region]);

  return (
    <View style={styles.wrap}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        pitchEnabled={false}
        rotateEnabled={false}
        toolbarEnabled={false}
        onRegionChangeComplete={(nextRegion) =>
          onRegionChangeRef.current?.(nextRegion.latitude, nextRegion.longitude)
        }>
        {tileUrlTemplate ? (
          <UrlTile
            urlTemplate={tileUrlTemplate}
            tileSize={TILE_SIZE}
            maximumZ={16}
            zIndex={1}
            opacity={0.8}
          />
        ) : null}
        {polylines.map((line) => (
          <Polyline
            key={line.id}
            coordinates={line.path}
            strokeColor={withAlpha(line.color, line.opacity ?? 0.55)}
            strokeWidth={line.width ?? 3}
            zIndex={2}
          />
        ))}
        {circles.map((circle) => (
          <Circle
            key={circle.id}
            center={{ latitude: circle.latitude, longitude: circle.longitude }}
            radius={circle.radiusM}
            fillColor={withAlpha(circle.color, circle.opacity)}
            strokeColor={withAlpha(circle.color, circle.strokeOpacity ?? circle.opacity * 0.8)}
            strokeWidth={1}
            zIndex={3}
          />
        ))}
        <Marker coordinate={{ latitude, longitude }} pinColor={theme.colors.danger} />
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
            title={marker.title}
            pinColor={
              marker.id === selectedMarkerId
                ? theme.colors.accent
                : marker.color ?? theme.colors.success
            }
            onPress={() => onMarkerPress?.(marker.id)}
          />
        ))}
      </MapView>
      {overlay ? (
        <View pointerEvents="none" style={styles.overlay}>
          {overlay}
        </View>
      ) : null}
    </View>
  );
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#') && color.length === 7) {
    const clamped = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
    return `${color}${clamped.toString(16).padStart(2, '0')}`;
  }
  return color;
}

function buildRegion(latitude: number, longitude: number, zoom: number): Region {
  const longitudeDelta = 360 / 2 ** zoom;
  return {
    latitude,
    longitude,
    latitudeDelta: longitudeDelta * 0.7,
    longitudeDelta,
  };
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
    map: { flex: 1 },
    overlay: {
      ...StyleSheet.absoluteFillObject,
    },
  });
}
