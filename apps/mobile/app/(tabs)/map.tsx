import { Text, View, StyleSheet, Pressable, Platform } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { GlassCard } from '@/src/components/GlassCard';
import { useGlassStyles } from '@/src/hooks/use-glass-styles';
import { Ionicons } from '@expo/vector-icons';
import {
  ADAIR_CLINICS,
  ADAIR_DOCTORS,
  ADAIR_SPECIALIZATION_LABELS,
  getPlaceLevelColor,
  getPlaceLevelLabel,
  getPollenPeaksForMonth,
  formatPollenMonth,
  type CatalogPlace,
} from '@allerguide/core';
import { useAppStore } from '@/src/store/app-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { getRecommendedPlaces } from '@/src/services/place-service';

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

const LAYERS = [
  { key: 'places', labelKey: 'map.places' },
  { key: 'pollen', labelKey: 'map.pollen' },
  { key: 'adair', labelKey: 'map.adair' },
] as const;

type MapLayer = (typeof LAYERS)[number]['key'];

export default function MapScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const glass = useGlassStyles();
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.activeProfile);
  const [layer, setLayer] = useState<MapLayer>('places');
  const [places, setPlaces] = useState<CatalogPlace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );

  const refresh = useCallback(async () => {
    setPlaces(getRecommendedPlaces(profile));
    if (Platform.OS === 'web') return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Location = require('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    const location = await Location.getCurrentPositionAsync({});
    setUserLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const selected = places.find((place) => place.id === selectedId) ?? places[0] ?? null;
  const pollenMonth = new Date().getMonth() + 1;
  const pollenPeaks = getPollenPeaksForMonth(pollenMonth);

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
      <ScreenHeader title={t('map.title')} subtitle={t('map.subtitle')} />

      <ProfileSwitcher />

      <View style={glass.toggleRow}>
        {LAYERS.map((item) => (
          <Pressable
            key={item.key}
            style={[glass.toggle, layer === item.key && glass.toggleActive]}
            onPress={() => setLayer(item.key)}>
            <Text style={[glass.toggleText, layer === item.key && glass.toggleTextActive]}>{t(item.labelKey)}</Text>
          </Pressable>
        ))}
      </View>

      {layer === 'places' ? (
        <>
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
          <Text style={styles.mapText}>{t('map.mapWebHint')}</Text>
        </View>
      )}

      <Text style={glass.sectionLabel}>{t('map.recommended')}</Text>

      {places.map((place) => {
        const levelColor = getPlaceLevelColor(place.level, theme.isDark);
        const levelLabel = getPlaceLevelLabel(place.level);
        const isSelected = selected?.id === place.id;

        return (
          <GlassCard key={place.id} style={styles.card}>
            <Pressable
              style={({ pressed }) => [styles.cardInner, isSelected && styles.cardSelected, pressed && styles.pressed]}
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
              <Text style={styles.cardNote}>{place.note}</Text>
              {place.tags.length > 0 ? (
                <Text style={styles.tags}>{place.tags.join(' · ')}</Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </Pressable>
          </GlassCard>
        );
      })}

      <Text style={glass.disclaimer}>{t('map.disclaimerPlaces')}</Text>
        </>
      ) : null}

      {layer === 'pollen' ? (
        <>
          <View style={styles.pollenHero}>
            <Ionicons name="leaf" size={28} color={theme.colors.success} />
            <Text style={styles.pollenTitle}>{t('map.pollenMapTitle', { month: formatPollenMonth(pollenMonth) })}</Text>
            <Text style={styles.pollenSub}>{t('map.pollenMapSub')}</Text>
          </View>
          {pollenPeaks.map((peak) => (
            <GlassCard key={peak.allergen} style={styles.card}>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{peak.allergen}</Text>
                <Text style={styles.cardNote}>
                  {t('map.peakSeason', { month: formatPollenMonth(peak.peakMonth), region: peak.region })}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: theme.colors.warningLight }]}>
                <Text style={[styles.badgeText, { color: theme.colors.warning }]}>{t('map.season')}</Text>
              </View>
            </GlassCard>
          ))}
          <Text style={glass.disclaimer}>{t('map.disclaimerPollen')}</Text>
        </>
      ) : null}

      {layer === 'adair' ? (
        <>
          {ADAIR_CLINICS.map((clinic) => (
            <GlassCard key={clinic.id} style={styles.card}>
              <View style={[styles.cardIcon, { backgroundColor: `${theme.colors.purple}18` }]}>
                <Ionicons name="medical" size={24} color={theme.colors.purple} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{clinic.name}</Text>
                <Text style={styles.cardNote}>{clinic.address}</Text>
                <Text style={styles.tags}>{clinic.phone}</Text>
              </View>
              {clinic.isNkcc ? (
                <View style={[styles.badge, { backgroundColor: theme.colors.accentLight }]}>
                  <Text style={[styles.badgeText, { color: theme.colors.accent }]}>{t('map.nkcc')}</Text>
                </View>
              ) : null}
            </GlassCard>
          ))}
          {ADAIR_DOCTORS.map((doctor) => (
            <GlassCard key={doctor.id} style={styles.card}>
              <View style={[styles.cardIcon, { backgroundColor: theme.colors.successLight }]}>
                <Ionicons name="person" size={24} color={theme.colors.success} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{doctor.name}</Text>
                <Text style={styles.cardNote}>{doctor.degree}</Text>
                <Text style={styles.tags}>{ADAIR_SPECIALIZATION_LABELS[doctor.specialization]}</Text>
                {doctor.isChiefExpert ? (
                  <Text style={[styles.tags, { color: theme.colors.accent }]}>{t('map.chiefExpert')}</Text>
                ) : null}
              </View>
            </GlassCard>
          ))}
          <Text style={glass.disclaimer}>{t('map.disclaimerAdair')}</Text>
        </>
      ) : null}
    </Screen>
  );
}

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    pollenHero: {
      backgroundColor: colors.tealLight,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      ...(shadows.glass as object),
    },
    pollenTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    pollenSub: { fontSize: 12, color: colors.textSecondary },
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
      backgroundColor: colors.tealLight,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      ...(shadows.glass as object),
    },
    mapText: { fontSize: 14, color: colors.textMuted, fontWeight: '500', textAlign: 'center', paddingHorizontal: 24 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 0,
    },
    cardInner: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
    cardSelected: { opacity: 0.92 },
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
  });
}
