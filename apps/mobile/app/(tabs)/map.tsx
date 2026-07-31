import { Text, View, StyleSheet, Pressable, Linking } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ADAIR_DOCTORS,
  ADAIR_SPECIALIZATION_LABELS,
  buildPlacesMapUrl,
  buildPollenRiskMapUrl,
  buildYandexMapWidgetUrl,
  getPollenPeaksForMonth,
  formatPollenMonth,
  POLLEN_MAP_SCALE_ZOOM,
  POLLEN_MAP_TAXON_IDS,
  PRIMARY_POLLEN_MAP_TAXON_IDS,
  SECONDARY_POLLEN_MAP_TAXON_IDS,
  pollenTaxonToGoogleMapType,
  resolvePollenRegion,
  type MapPoiCategory,
  type PollenMapTaxonId,
  type PollenTierLevel,
} from '@allerguide/core';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { GlassCard } from '@/src/components/GlassCard';
import { Disclaimer } from '@/src/components/Disclaimer';
import { YandexMap } from '@/src/components/YandexMap';
import { GooglePollenMap } from '@/src/components/GooglePollenMap';
import { MapAllergenChips } from '@/src/components/MapAllergenChips';
import { PollenForecastStrip } from '@/src/components/PollenForecastStrip';
import { PollenIndexCard } from '@/src/components/PollenIndexCard';
import { PollenPlantSheet } from '@/src/components/PollenPlantSheet';
import { MapPoiSheet } from '@/src/components/MapPoiSheet';
import { ProfileHeaderButton } from '@/src/components/ProfileHeaderButton';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/src/store/app-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { getMapPois, type MapPoiWithDistance } from '@/src/services/place-service';
import { getCurrentLocation } from '@/src/services/location-service';
import {
  fetchPollenMapSnapshot,
  type PollenMapSnapshot,
} from '@/src/services/pollen-map-service';
import { isGooglePollenHeatmapAvailable } from '@/src/services/pollen-heatmap-service';
import {
  GOOGLE_MAP_PRIMARY_ENABLED,
  GOOGLE_POLLEN_HEATMAP_ENABLED,
} from '@/src/constants/features';

const TAXON_LABEL_KEYS: Record<PollenMapTaxonId, string> = {
  birch_pollen: 'map.pollenBirch',
  grass_pollen: 'map.pollenGrass',
  ragweed_pollen: 'map.pollenRagweed',
  alder_pollen: 'map.pollenAlder',
  mugwort_pollen: 'map.pollenMugwort',
  olive_pollen: 'map.pollenOlive',
};

const LEVEL_LABEL_KEYS: Record<PollenTierLevel, string> = {
  low: 'map.pollenLow',
  mid: 'map.pollenModerate',
  high: 'map.pollenHigh',
};

const DEFAULT_POI_CATEGORIES: MapPoiCategory[] = ['restaurant', 'medical', 'pharmacy'];

export default function MapScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const ui = useUiStyles();
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.activeProfile);

  const [coords, setCoords] = useState({ lat: 55.75, lon: 37.62, label: '' });
  const [pollenSnapshot, setPollenSnapshot] = useState<PollenMapSnapshot | null>(null);
  const [pois, setPois] = useState<MapPoiWithDistance[]>([]);
  const [selectedTaxonId, setSelectedTaxonId] = useState<PollenMapTaxonId>('birch_pollen');
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [poiCategories, setPoiCategories] =
    useState<MapPoiCategory[]>(DEFAULT_POI_CATEGORIES);

  const refresh = useCallback(async () => {
    const location = await getCurrentLocation();
    setCoords({ lat: location.lat, lon: location.lon, label: location.label });
    const [snapshot, mapPois] = await Promise.all([
      fetchPollenMapSnapshot(location, profile?.allergies ?? '[]'),
      getMapPois(profile, { latitude: location.lat, longitude: location.lon }, poiCategories),
    ]);
    setPollenSnapshot(snapshot);
    setPois(mapPois);
    setSelectedPoiId((current) =>
      current && mapPois.some((poi) => poi.id === current)
        ? current
        : mapPois[0]?.id ?? null,
    );
  }, [poiCategories, profile]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const pollenMonth = new Date().getMonth() + 1;
  const pollenRegion = resolvePollenRegion(coords.lat, coords.lon);
  const pollenPeaks = getPollenPeaksForMonth(pollenMonth, pollenRegion.id).filter((peak) =>
    POLLEN_MAP_TAXON_IDS.some((taxonId) => taxonId === peak.taxonId),
  );

  const selectedReading =
    pollenSnapshot?.readings.find((reading) => reading.taxonId === selectedTaxonId) ?? null;
  const selectedUpi = pollenSnapshot?.upiByTaxon[selectedTaxonId] ?? null;
  const plantDetail = pollenSnapshot?.plants[selectedTaxonId] ?? null;
  const isCalendarFallback = pollenSnapshot?.source === 'calendar';

  const useGoogleMap =
    (GOOGLE_MAP_PRIMARY_ENABLED || GOOGLE_POLLEN_HEATMAP_ENABLED) &&
    Boolean(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim());
  const useHeatmap = isGooglePollenHeatmapAvailable();
  const googleMapType = useHeatmap ? pollenTaxonToGoogleMapType(selectedTaxonId) : null;

  const chipItems = useMemo(() => {
    const ids = [...PRIMARY_POLLEN_MAP_TAXON_IDS, ...SECONDARY_POLLEN_MAP_TAXON_IDS];
    return ids.map((taxonId) => {
      const reading = pollenSnapshot?.readings.find((item) => item.taxonId === taxonId);
      return {
        taxonId,
        level: reading?.level ?? null,
        profileRelevant: reading?.profileRelevant ?? false,
      };
    });
  }, [pollenSnapshot]);

  const markers = useMemo(
    () =>
      pois.map((poi) => ({
        id: poi.id,
        latitude: poi.lat,
        longitude: poi.lng,
        title: poi.title,
        color:
          poi.category === 'restaurant'
            ? theme.colors.success
            : poi.category === 'pharmacy'
              ? theme.colors.warning
              : theme.colors.accent,
      })),
    [pois, theme.colors],
  );

  const yandexPlacesUrl = useMemo(() => {
    if (pois.length === 0) {
      return buildYandexMapWidgetUrl({
        center: { latitude: coords.lat, longitude: coords.lon },
      });
    }
    return buildPlacesMapUrl(
      pois.map((poi) => ({
        id: poi.id,
        title: poi.title,
        note: poi.note,
        level: poi.level,
        icon: poi.icon,
        lat: poi.lat,
        lng: poi.lng,
        tags: poi.tags,
      })),
      selectedPoiId,
    );
  }, [coords.lat, coords.lon, pois, selectedPoiId]);

  const yandexPollenUrl = useMemo(
    () =>
      buildPollenRiskMapUrl({
        center: { latitude: coords.lat, longitude: coords.lon },
        zoom: POLLEN_MAP_SCALE_ZOOM.city,
      }),
    [coords.lat, coords.lon],
  );

  const toggleCategory = useCallback((category: MapPoiCategory) => {
    setPoiCategories((current) => {
      if (current.includes(category)) {
        const next = current.filter((item) => item !== category);
        return next.length > 0 ? next : current;
      }
      return [...current, category];
    });
  }, []);

  const levelLabel = selectedReading
    ? t(LEVEL_LABEL_KEYS[selectedReading.level])
    : null;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ScreenEyebrow section={t('map.eyebrow')} />
          <Text style={ui.docTitle}>{t('map.title')}</Text>
          <Text style={ui.docMeta}>{t('map.subtitleUnified')}</Text>
          <Text style={styles.regionLabel}>
            {coords.label || pollenRegion.name}
          </Text>
        </View>
        <ProfileHeaderButton />
      </View>

      <MapAllergenChips
        items={chipItems}
        selectedTaxonId={selectedTaxonId}
        onSelect={setSelectedTaxonId}
        labelForTaxon={(taxonId) => t(TAXON_LABEL_KEYS[taxonId] as 'map.pollenBirch')}
      />

      {useGoogleMap ? (
        <GooglePollenMap
          latitude={coords.lat}
          longitude={coords.lon}
          zoom={POLLEN_MAP_SCALE_ZOOM.city}
          mapType={googleMapType}
          height={320}
          markers={markers}
          selectedMarkerId={selectedPoiId}
          onMarkerPress={setSelectedPoiId}
        />
      ) : (
        <YandexMap url={yandexPlacesUrl || yandexPollenUrl} height={320} interactive={false} />
      )}

      <View style={styles.legendRow}>
        <LegendDot color={theme.colors.danger} label={t('map.legendHigh')} />
        <LegendDot color={theme.colors.warning} label={t('map.legendModerate')} />
        <LegendDot color={theme.colors.success} label={t('map.legendLow')} />
      </View>

      <Text style={styles.mapAttribution}>
        {t(
          useGoogleMap
            ? 'map.pollenGoogleMapAttribution'
            : 'map.pollenMapAttribution',
        )}
      </Text>

      <PollenIndexCard
        taxonLabel={t(TAXON_LABEL_KEYS[selectedTaxonId] as 'map.pollenBirch')}
        upi={selectedUpi}
        grainsPerM3={selectedReading?.value ?? null}
        levelLabel={levelLabel}
      />

      <PollenForecastStrip
        days={pollenSnapshot?.forecastDays ?? []}
        taxonId={selectedTaxonId}
      />

      {isCalendarFallback ? (
        <GlassCard style={styles.calendarCard}>
          <Ionicons name="calendar-outline" size={22} color={theme.colors.warning} />
          <View style={styles.calendarBody}>
            <Text style={styles.calendarTitle}>{t('map.pollenCalendarFallback')}</Text>
            {pollenPeaks.length > 0 ? (
              pollenPeaks.map((peak) => (
                <Text key={peak.taxonId} style={styles.calendarText}>
                  {peak.label}: {formatPollenMonth(peak.peakMonth)}
                </Text>
              ))
            ) : (
              <Text style={styles.calendarText}>{t('map.pollenNoSeason')}</Text>
            )}
          </View>
        </GlassCard>
      ) : null}

      <Text style={styles.sectionTitle}>{t('map.plantTitle')}</Text>
      <PollenPlantSheet detail={plantDetail} />

      <MapPoiSheet
        pois={pois}
        selectedId={selectedPoiId}
        categories={poiCategories}
        onSelect={setSelectedPoiId}
        onToggleCategory={toggleCategory}
      />

      <Text style={styles.sectionTitle}>{t('map.adairDoctors')}</Text>
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
                accessibilityRole="link">
                <Text style={[styles.tags, styles.phoneLink]}>{doctor.phone}</Text>
              </Pressable>
            ) : null}
          </View>
        </GlassCard>
      ))}

      <Pressable
        accessibilityRole="link"
        style={({ pressed }) => [styles.yandexButton, pressed && styles.pressed]}
        onPress={() => {
          if (pollenSnapshot) void Linking.openURL(pollenSnapshot.yandexPollenUrl);
        }}
        disabled={!pollenSnapshot}>
        <View style={styles.yandexButtonText}>
          <Text style={styles.yandexButtonTitle}>{t('map.openYandexPollen')}</Text>
          <Text style={styles.yandexButtonSubtitle}>{t('map.openYandexPollenHint')}</Text>
        </View>
        <Ionicons name="open-outline" size={20} color={theme.colors.accent} />
      </Pressable>

      <Disclaimer>{t('map.disclaimerUnified')}</Disclaimer>
    </Screen>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text
        style={{
          fontFamily: theme.fonts.sans,
          fontSize: 11,
          color: theme.colors.textMuted,
        }}>
        {label}
      </Text>
    </View>
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
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      marginTop: 4,
    },
    mapAttribution: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
      marginBottom: 4,
    },
    sectionTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      color: colors.head,
      marginTop: 4,
    },
    calendarCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    calendarBody: { flex: 1, gap: 4 },
    calendarTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      color: colors.text,
    },
    calendarText: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 0,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: { flex: 1, gap: 6 },
    cardTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
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
    phoneLink: {
      color: colors.accent,
      textDecorationLine: 'underline',
    },
    yandexButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    yandexButtonText: { flex: 1, gap: 2 },
    yandexButtonTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    yandexButtonSubtitle: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
    },
    pressed: { opacity: 0.75 },
  });
}
