import type { ReactNode } from 'react';
import { ActivityIndicator, Linking, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { POLLEN_MAP_SCALE_ZOOM, type GooglePollenMapType } from '@allerguide/core';
import { GooglePollenMap } from '@/src/components/GooglePollenMap';
import { YandexInteractiveMap } from '@/src/components/YandexInteractiveMap';
import { YandexMap } from '@/src/components/YandexMap';
import { MAP_HERO_HEIGHT } from '@/src/components/map/map-constants';
import type { MapScreenStyles } from '@/src/components/map/map-screen-styles';
import type { GoogleMapCircle, GoogleMapMarker, GoogleMapPolyline } from '@/src/components/google-pollen-map.types';
import type { AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

type Props = {
  styles: MapScreenStyles;
  theme: AppTheme;
  latitude: number;
  longitude: number;
  useGoogleMap: boolean;
  useYandexInteractive: boolean;
  showPlaceMarkers: boolean;
  showPlacesLayer: boolean;
  showSearchAreaButton: boolean;
  searchingArea: boolean;
  yandexUrl: string;
  googleMapType: GooglePollenMapType | null;
  airTileUrlTemplate: string | null;
  markers: GoogleMapMarker[];
  circles: GoogleMapCircle[];
  polylines: GoogleMapPolyline[];
  selectedPoiId: string | null;
  overlay?: ReactNode;
  mapAttributionKey: string | null;
  yandexPollenUrl?: string;
  onMarkerPress: (id: string) => void;
  onRegionChange: (lat: number, lon: number) => void;
  onMapLoaded?: () => void;
  onSearchThisArea: () => void;
};

export function MapCanvas({
  styles,
  theme,
  latitude,
  longitude,
  useGoogleMap,
  useYandexInteractive,
  showPlaceMarkers,
  showPlacesLayer,
  showSearchAreaButton,
  searchingArea,
  yandexUrl,
  googleMapType,
  airTileUrlTemplate,
  markers,
  circles,
  polylines,
  selectedPoiId,
  overlay,
  mapAttributionKey,
  yandexPollenUrl,
  onMarkerPress,
  onRegionChange,
  onMapLoaded,
  onSearchThisArea,
}: Props) {
  const { t } = useTranslation();

  return (
    <>
      {useYandexInteractive ? (
        <YandexInteractiveMap
          latitude={latitude}
          longitude={longitude}
          zoom={POLLEN_MAP_SCALE_ZOOM.city}
          height={MAP_HERO_HEIGHT}
          markers={showPlaceMarkers ? markers : []}
          selectedMarkerId={selectedPoiId}
          onMarkerPress={onMarkerPress}
          onRegionChange={onRegionChange}
          overlay={overlay}
          unavailableLabel={t('map.basemapUnavailable')}
        />
      ) : useGoogleMap ? (
        <GooglePollenMap
          latitude={latitude}
          longitude={longitude}
          zoom={POLLEN_MAP_SCALE_ZOOM.city}
          mapType={googleMapType}
          tileUrlTemplate={airTileUrlTemplate}
          height={MAP_HERO_HEIGHT}
          interactive
          markers={markers}
          circles={circles}
          polylines={polylines}
          selectedMarkerId={selectedPoiId}
          onMarkerPress={onMarkerPress}
          onRegionChange={onRegionChange}
          onMapLoaded={onMapLoaded}
          overlay={overlay}
        />
      ) : (
        <YandexMap url={yandexUrl} height={MAP_HERO_HEIGHT} interactive={false} overlay={overlay} />
      )}

      {showSearchAreaButton ? (
        <Pressable
          testID="map-search-area"
          style={styles.searchAreaBtn}
          hitSlop={8}
          onPress={onSearchThisArea}
          disabled={searchingArea}
          accessibilityRole="button"
          accessibilityLabel={t('map.searchThisArea')}>
          {searchingArea ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            <Ionicons name="search" size={16} color={theme.colors.accent} />
          )}
          <Text style={styles.searchAreaText}>{t('map.searchThisArea')}</Text>
        </Pressable>
      ) : null}

      {mapAttributionKey ? (
        <Text style={styles.mapAttribution} testID="map-attribution">
          {t(mapAttributionKey)}
        </Text>
      ) : null}
      {showPlacesLayer ? (
        <Text style={styles.mapAttribution} testID="map-places-osm-attribution">
          {t('map.placesOsmAttribution')}
        </Text>
      ) : null}

      {!useGoogleMap && !useYandexInteractive ? (
        <Pressable
          style={styles.yandexBanner}
          hitSlop={8}
          onPress={() => {
            if (yandexPollenUrl) void Linking.openURL(yandexPollenUrl);
          }}
          accessibilityRole="link">
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.warning} />
          <Text style={styles.yandexBannerText}>{t('map.yandexOverviewBanner')}</Text>
          <Ionicons name="open-outline" size={16} color={theme.colors.accent} />
        </Pressable>
      ) : null}

      {!useGoogleMap && showPlacesLayer ? (
        <Text style={styles.listFirstHint}>{t('map.listFirstHint')}</Text>
      ) : null}
    </>
  );
}
