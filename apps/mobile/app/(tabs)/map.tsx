import { Text, View, StyleSheet, Pressable, Platform } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { Ionicons } from '@expo/vector-icons';
import {
  formatDistanceKm,
  getPlaceLevelColor,
  getPlaceLevelLabel,
  type CatalogPlace,
} from '@allerguide/core';
import { useAppStore } from '@/src/store/app-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { getRecommendedPlaces, type PlaceWithDistance } from '@/src/services/place-service';

const DEFAULT_REGION = {
  latitude: 55.7558,
  longitude: 37.6173,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

let MapViewComponent: typeof import('react-native-maps').default | null = null;
let MarkerComponent: typeof import('react-native-maps').Marker | null = null;

if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const maps = require('react-native-maps');
  MapViewComponent = maps.default;
  MarkerComponent = maps.Marker;
}

export default function MapScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const profile = useAppStore((s) => s.activeProfile);
  const [places, setPlaces] = useState<PlaceWithDistance[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );

  const refresh = useCallback(async () => {
    let origin: { latitude: number; longitude: number } | null = null;

    if (Platform.OS !== 'web') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        origin = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(origin);
      }
    }

    setPlaces(getRecommendedPlaces(profile, origin));
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const selected = places.find((place) => place.id === selectedId) ?? places[0] ?? null;

  const levelBg = useMemo(
    () =>
      ({
        high: theme.isDark ? '#1A3D28' : theme.colors.successLight,
        medium: theme.isDark ? '#3D2E10' : theme.colors.warningLight,
        low: theme.isDark ? '#3D1512' : theme.colors.dangerLight,
      }) as Record<CatalogPlace['level'], string>,
    [theme],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Карта и места</Text>
        <Text style={styles.subtitle}>Безопасные заведения рядом</Text>
      </View>

      <ProfileSwitcher />

      {Platform.OS !== 'web' && MapViewComponent && MarkerComponent ? (
        <View style={styles.mapWrap}>
          <MapViewComponent style={styles.map} initialRegion={DEFAULT_REGION} showsUserLocation={!!userLocation}>
            {places.map((place) => {
              const color = getPlaceLevelColor(place.level, theme.isDark);
              return (
                <MarkerComponent
                  key={place.id}
                  coordinate={{ latitude: place.lat, longitude: place.lng }}
                  title={place.title}
                  description={place.note}
                  pinColor={color}
                  onPress={() => setSelectedId(place.id)}
                />
              );
            })}
          </MapViewComponent>
        </View>
      ) : (
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={40} color={theme.colors.textMuted} />
          <Text style={styles.mapText}>Интерактивная карта доступна в мобильном приложении</Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>Рекомендованные места</Text>

      {places.map((place) => {
        const levelColor = getPlaceLevelColor(place.level, theme.isDark);
        const levelLabel = getPlaceLevelLabel(place.level);
        const isSelected = selected?.id === place.id;

        return (
          <Pressable
            key={place.id}
            style={({ pressed }) => [
              styles.card,
              isSelected && styles.cardSelected,
              pressed && styles.pressed,
            ]}
            onPress={() => setSelectedId(place.id)}>
            <View style={[styles.cardIcon, { backgroundColor: levelBg[place.level] }]}>
              <Ionicons name={place.icon as any} size={24} color={levelColor} />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{place.title}</Text>
                <View style={[styles.badge, { backgroundColor: levelBg[place.level] }]}>
                  <Text style={[styles.badgeText, { color: levelColor }]}>{levelLabel}</Text>
                </View>
              </View>
              <Text style={styles.cardNote}>
                {place.note}
                {place.distanceKm != null ? ` · ${formatDistanceKm(place.distanceKm)}` : ''}
              </Text>
              {place.tags.length > 0 ? (
                <Text style={styles.tags}>{place.tags.join(' · ')}</Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </Pressable>
        );
      })}

      <Text style={styles.disclaimer}>
        Информация о местах носит ориентировочный характер, состав нужно уточнять в заведении.
      </Text>
    </Screen>
  );
}

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    header: { gap: 3 },
    title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: colors.textSecondary },
    mapWrap: {
      height: 220,
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    map: { flex: 1 },
    mapPlaceholder: {
      height: 160,
      backgroundColor: colors.card,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    mapText: { fontSize: 14, color: colors.textMuted, fontWeight: '500', textAlign: 'center', paddingHorizontal: 24 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: -4,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 16,
      ...(shadows.md as object),
    },
    cardSelected: { borderWidth: 1.5, borderColor: colors.accent },
    pressed: { opacity: 0.85 },
    cardIcon: {
      width: 50,
      height: 50,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: { flex: 1, gap: 6 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    badge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 8 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    cardNote: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    tags: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
    disclaimer: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  });
}
