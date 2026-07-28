import { Text, View, StyleSheet, Pressable, Linking } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { GlassCard } from '@/src/components/GlassCard';
import { Disclaimer } from '@/src/components/Disclaimer';
import { YandexMap } from '@/src/components/YandexMap';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { Ionicons } from '@expo/vector-icons';
import {
  ADAIR_CLINICS,
  ADAIR_DOCTORS,
  ADAIR_SPECIALIZATION_LABELS,
  buildPlacesMapUrl,
  buildYandexMapWidgetUrl,
  getPlaceLevelColor,
  getPlaceLevelLabel,
  getPollenPeaksForMonth,
  formatPollenMonth,
  POLLEN_MAP_TAXON_IDS,
  resolvePollenRegion,
  type CatalogPlace,
} from '@allerguide/core';
import { useAppStore } from '@/src/store/app-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { getRecommendedPlaces } from '@/src/services/place-service';
import { getCurrentLocation } from '@/src/services/location-service';
import { ProfileHeaderButton } from '@/src/components/ProfileHeaderButton';
import { PollenMapLayer } from '@/src/components/PollenMapLayer';
import {
  fetchPollenMapSnapshot,
  type PollenMapSnapshot,
} from '@/src/services/pollen-map-service';

const LAYERS = [
  { key: 'places', labelKey: 'map.places' },
  { key: 'pollen', labelKey: 'map.pollen' },
  { key: 'adair', labelKey: 'map.adair' },
] as const;

type MapLayer = (typeof LAYERS)[number]['key'];

export default function MapScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const ui = useUiStyles();
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.activeProfile);
  const [layer, setLayer] = useState<MapLayer>('places');
  const [places, setPlaces] = useState<CatalogPlace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pollenSnapshot, setPollenSnapshot] = useState<PollenMapSnapshot | null>(null);

  const [coords, setCoords] = useState({ lat: 55.75, lon: 37.62, label: '' });

  const refresh = useCallback(async () => {
    const location = await getCurrentLocation();
    setCoords({ lat: location.lat, lon: location.lon, label: location.label });
    setPlaces(
      getRecommendedPlaces(profile, {
        latitude: location.lat,
        longitude: location.lon,
      }),
    );
    setPollenSnapshot(
      await fetchPollenMapSnapshot(location, profile?.allergies ?? '[]'),
    );
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const selected = places.find((place) => place.id === selectedId) ?? places[0] ?? null;
  const mapUrl = useMemo(() => buildPlacesMapUrl(places, selectedId), [places, selectedId]);
  const pollenMonth = new Date().getMonth() + 1;
  const pollenRegion = resolvePollenRegion(coords.lat, coords.lon);
  const pollenPeaks = getPollenPeaksForMonth(pollenMonth, pollenRegion.id).filter((peak) =>
    POLLEN_MAP_TAXON_IDS.some((taxonId) => taxonId === peak.taxonId),
  );

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
        <View style={styles.headerText}>
          <ScreenEyebrow section={t('map.eyebrow')} />
          <Text style={ui.docTitle}>{t('map.title')}</Text>
          <Text style={ui.docMeta}>{t('map.subtitle')}</Text>
          <Text style={styles.regionLabel}>{pollenRegion.name}</Text>
        </View>
        <ProfileHeaderButton />
      </View>

      <ProfileSwitcher />

      <View style={ui.toggleRow}>
        {LAYERS.map((item) => (
          <Pressable
            key={item.key}
            style={[ui.toggle, layer === item.key && ui.toggleActive]}
            onPress={() => setLayer(item.key)}>
            <Text style={[ui.toggleText, layer === item.key && ui.toggleTextActive]}>
              {t(item.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      {layer === 'places' ? (
        <>
          {/* Always render the basemap — fall back to user coords when no places found */}
          <YandexMap
            url={
              places.length > 0
                ? mapUrl
                : buildYandexMapWidgetUrl({
                    center: { latitude: coords.lat, longitude: coords.lon },
                  })
            }
          />

          {places.length === 0 ? (
            <View style={styles.emptyPlacesHint}>
              <Ionicons name="information-circle-outline" size={16} color={theme.colors.textMuted} />
              <Text style={styles.emptyPlacesText}>{t('map.emptyPlaces')}</Text>
            </View>
          ) : null}

          <Text style={styles.mapAttribution}>{t('map.yandexAttribution')}</Text>

          <Text style={ui.sectionLabel}>{t('map.recommended')}</Text>

          {places.map((place) => {
            const levelColor = getPlaceLevelColor(place.level, theme.isDark);
            const levelLabel = getPlaceLevelLabel(place.level);
            const isSelected = selected?.id === place.id;

            return (
              <GlassCard key={place.id} style={styles.card}>
                <Pressable
                  style={({ pressed }) => [
                    styles.cardInner,
                    isSelected && styles.cardSelected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setSelectedId(place.id)}>
                  <View style={[styles.cardIcon, { backgroundColor: levelBg[place.level] }]}>
                    <Ionicons name={place.icon as any} size={22} color={levelColor} />
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

          <Disclaimer>{t('map.disclaimerPlaces')}</Disclaimer>
        </>
      ) : null}

      {layer === 'pollen' ? (
        <PollenMapLayer
          latitude={coords.lat}
          longitude={coords.lon}
          regionName={coords.label || pollenRegion.name}
          snapshot={pollenSnapshot}
          calendarPeaks={pollenPeaks}
          formatMonth={formatPollenMonth}
        />
      ) : null}

      {layer === 'adair' ? (
        <>
          {ADAIR_CLINICS.map((clinic) => (
            <GlassCard key={clinic.id} style={styles.card}>
              <View style={[styles.cardIcon, { backgroundColor: `${theme.colors.accent}18` }]}>
                <Ionicons name="medical" size={22} color={theme.colors.accent} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{clinic.name}</Text>
                <Text style={styles.cardNote}>{clinic.address}</Text>
                <Pressable
                  onPress={() => void Linking.openURL(`tel:${clinic.phone}`)}
                  accessibilityRole="link"
                  accessibilityLabel={clinic.phone}>
                  <Text style={[styles.tags, styles.phoneLink]}>{clinic.phone}</Text>
                </Pressable>
              </View>
              {clinic.isNkcc ? (
                <View style={[styles.badge, { backgroundColor: theme.colors.accentLight }]}>
                  <Text style={[styles.badgeText, { color: theme.colors.accent }]}>
                    {t('map.nkcc')}
                  </Text>
                </View>
              ) : null}
            </GlassCard>
          ))}
          {ADAIR_DOCTORS.map((doctor) => (
            <GlassCard key={doctor.id} style={styles.card}>
              <View style={[styles.cardIcon, { backgroundColor: theme.colors.successLight }]}>
                <Ionicons name="person" size={22} color={theme.colors.success} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{doctor.name}</Text>
                <Text style={styles.cardNote}>{doctor.degree}</Text>
                <Text style={styles.tags}>
                  {ADAIR_SPECIALIZATION_LABELS[doctor.specialization]}
                </Text>
                {doctor.phone ? (
                  <Pressable
                    onPress={() => void Linking.openURL(`tel:${doctor.phone!}`)}
                    accessibilityRole="link"
                    accessibilityLabel={doctor.phone}>
                    <Text style={[styles.tags, styles.phoneLink]}>{doctor.phone}</Text>
                  </Pressable>
                ) : null}
                {doctor.isChiefExpert ? (
                  <Text style={[styles.tags, { color: theme.colors.accent }]}>
                    {t('map.chiefExpert')}
                  </Text>
                ) : null}
              </View>
            </GlassCard>
          ))}
          <Disclaimer>{t('map.disclaimerAdair')}</Disclaimer>
        </>
      ) : null}
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerText: { flex: 1, gap: 2 },
    regionLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.accent,
      marginTop: 4,
    },
    mapPlaceholder: {
      height: 160,
      backgroundColor: colors.surfaceMuted,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mapText: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: 24,
      lineHeight: 20,
    },
    emptyPlacesHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
    },
    emptyPlacesText: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      flex: 1,
    },
    phoneLink: {
      color: colors.accent,
      textDecorationLine: 'underline',
    },
    mapAttribution: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 6,
      marginBottom: 4,
    },
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
      width: 44,
      height: 44,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: { flex: 1, gap: 6 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    cardTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    badge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4 },
    badgeText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
    },
    cardNote: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    tags: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
    },
  });
}
