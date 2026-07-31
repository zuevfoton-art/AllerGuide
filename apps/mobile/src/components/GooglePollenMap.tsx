import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
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
  selectedMarkerId,
  onMarkerPress,
  overlay,
}: GooglePollenMapProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, height), [height, theme]);
  const mapRef = useRef<MapView>(null);
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
        toolbarEnabled={false}>
        {tileUrlTemplate ? (
          <UrlTile
            urlTemplate={tileUrlTemplate}
            tileSize={TILE_SIZE}
            maximumZ={16}
            zIndex={1}
            opacity={0.8}
          />
        ) : null}
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
