import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  buildPollenRiskMapUrl,
  POLLEN_MAP_SCALES,
  POLLEN_MAP_SCALE_ZOOM,
  PRIMARY_POLLEN_MAP_TAXON_IDS,
  resolveScaledPollenReading,
  SECONDARY_POLLEN_MAP_TAXON_IDS,
  type PollenMapScale,
  type PollenMapTaxonId,
  type PollenTierLevel,
} from '@allerguide/core';
import { Disclaimer } from '@/src/components/Disclaimer';
import { GlassCard } from '@/src/components/GlassCard';
import { YandexMap } from '@/src/components/YandexMap';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import type { PollenMapSnapshot } from '@/src/services/pollen-map-service';

interface CalendarPeak {
  taxonId: string;
  label: string;
  peakMonth: number;
}

interface PollenMapLayerProps {
  latitude: number;
  longitude: number;
  regionName: string;
  snapshot: PollenMapSnapshot | null;
  calendarPeaks: CalendarPeak[];
  formatMonth: (month: number) => string;
}

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

const SCALE_LABEL_KEYS: Record<PollenMapScale, string> = {
  place: 'map.pollenScalePlace',
  city: 'map.pollenScaleCity',
  region: 'map.pollenScaleRegion',
};

const SCALE_HINT_KEYS: Record<PollenMapScale, string> = {
  place: 'map.pollenScalePlaceHint',
  city: 'map.pollenScaleCityHint',
  region: 'map.pollenScaleRegionHint',
};

export function PollenMapLayer({
  latitude,
  longitude,
  regionName,
  snapshot,
  calendarPeaks,
  formatMonth,
}: PollenMapLayerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [selectedTaxonId, setSelectedTaxonId] = useState<PollenMapTaxonId>('birch_pollen');
  const [mapScale, setMapScale] = useState<PollenMapScale>('city');
  const selectedReading = useMemo(
    () =>
      resolveScaledPollenReading(
        snapshot?.readings ?? [],
        snapshot?.nearbyLocations ?? [],
        selectedTaxonId,
        mapScale,
      ),
    [mapScale, selectedTaxonId, snapshot?.nearbyLocations, snapshot?.readings],
  );
  const mapUrl = useMemo(
    () =>
      buildPollenRiskMapUrl({
        center: { latitude, longitude },
        zoom: POLLEN_MAP_SCALE_ZOOM[mapScale],
      }),
    [latitude, longitude, mapScale],
  );
  const isCalendarFallback = snapshot?.source === 'calendar';

  const levelColor = selectedReading
    ? getLevelColor(selectedReading.level, theme)
    : theme.colors.textMuted;

  return (
    <>
      <View style={styles.heading}>
        <View style={styles.headingIcon}>
          <Ionicons name="leaf" size={20} color={theme.colors.success} />
        </View>
        <View style={styles.headingText}>
          <Text style={styles.title}>{t('map.pollenLiveTitle')}</Text>
          <Text style={styles.subtitle}>{regionName}</Text>
        </View>
      </View>

      <View style={styles.scaleRow}>
        {POLLEN_MAP_SCALES.map((scale) => {
          const isSelected = mapScale === scale;
          return (
            <Pressable
              key={scale}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              style={[styles.scaleButton, isSelected && styles.taxonButtonSelected]}
              onPress={() => setMapScale(scale)}>
              <Text style={[styles.taxonText, isSelected && styles.taxonTextSelected]}>
                {t(SCALE_LABEL_KEYS[scale])}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <YandexMap
        url={mapUrl}
        height={300}
        interactive={false}
        overlay={
          <View
            style={[styles.mapLevelOverlay, { borderColor: levelColor }]}
            accessibilityRole="summary">
            <View style={[styles.mapLevelDot, { backgroundColor: levelColor }]} />
            <View style={styles.mapLevelCopy}>
              <Text style={styles.mapLevelTaxon}>
                {t(TAXON_LABEL_KEYS[selectedTaxonId])}
                {selectedReading?.profileRelevant ? ` · ${t('map.pollenForYou')}` : ''}
              </Text>
              <Text style={[styles.mapLevelText, { color: levelColor }]}>
                {selectedReading
                  ? t(LEVEL_LABEL_KEYS[selectedReading.level])
                  : snapshot
                    ? t('map.pollenUnavailable')
                    : t('map.pollenLoading')}
              </Text>
              {selectedReading ? (
                <Text style={styles.mapLevelValue}>
                  {t('map.pollenValue', { value: selectedReading.value.toFixed(1) })}
                </Text>
              ) : null}
            </View>
          </View>
        }
      />
      <Text style={styles.attribution}>
        {t('map.pollenMapAttribution')}
        {snapshot && !isCalendarFallback
          ? ` · ${
              snapshot.source === 'cache'
                ? t('map.pollenSourceCache')
                : t('map.pollenSourceOpenMeteo')
            }`
          : ''}
      </Text>
      <Text style={styles.scaleHint}>{t(SCALE_HINT_KEYS[mapScale])}</Text>

      <View style={styles.taxonRow}>
        {PRIMARY_POLLEN_MAP_TAXON_IDS.map((taxonId) => {
          const reading = snapshot?.readings.find((item) => item.taxonId === taxonId);
          const isSelected = selectedTaxonId === taxonId;
          return (
            <Pressable
              key={taxonId}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              style={[styles.taxonButton, isSelected && styles.taxonButtonSelected]}
              onPress={() => setSelectedTaxonId(taxonId)}>
              <Text style={[styles.taxonText, isSelected && styles.taxonTextSelected]}>
                {t(TAXON_LABEL_KEYS[taxonId])}
              </Text>
              {reading?.profileRelevant ? <View style={styles.profileDot} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>{t('map.otherPollenAllergens')}</Text>
      <View style={styles.secondaryTaxonRow}>
        {SECONDARY_POLLEN_MAP_TAXON_IDS.map((taxonId) => {
          const isSelected = selectedTaxonId === taxonId;
          return (
            <Pressable
              key={taxonId}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              style={[
                styles.secondaryTaxonButton,
                isSelected && styles.taxonButtonSelected,
              ]}
              onPress={() => setSelectedTaxonId(taxonId)}>
              <Text style={[styles.taxonText, isSelected && styles.taxonTextSelected]}>
                {t(TAXON_LABEL_KEYS[taxonId])}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isCalendarFallback ? (
        <GlassCard style={styles.calendarCard}>
          <Ionicons name="calendar-outline" size={22} color={theme.colors.warning} />
          <View style={styles.readingBody}>
            <Text style={styles.readingTitle}>{t('map.pollenCalendarFallback')}</Text>
            {calendarPeaks.length > 0 ? (
              calendarPeaks.map((peak) => (
                <Text key={peak.taxonId} style={styles.valueText}>
                  {peak.label}: {formatMonth(peak.peakMonth)}
                </Text>
              ))
            ) : (
              <Text style={styles.valueText}>{t('map.pollenNoSeason')}</Text>
            )}
          </View>
        </GlassCard>
      ) : null}

      <Pressable
        accessibilityRole="link"
        style={({ pressed }) => [styles.yandexButton, pressed && styles.pressed]}
        onPress={() => {
          if (snapshot) void Linking.openURL(snapshot.yandexPollenUrl);
        }}
        disabled={!snapshot}>
        <View style={styles.yandexButtonText}>
          <Text style={styles.yandexButtonTitle}>{t('map.openYandexPollen')}</Text>
          <Text style={styles.yandexButtonSubtitle}>{t('map.openYandexPollenHint')}</Text>
        </View>
        <Ionicons name="open-outline" size={20} color={theme.colors.accent} />
      </Pressable>

      <Disclaimer>{t('map.disclaimerPollen')}</Disclaimer>
    </>
  );
}

function getLevelColor(level: PollenTierLevel, theme: AppTheme): string {
  if (level === 'high') return theme.colors.danger;
  if (level === 'mid') return theme.colors.warning;
  return theme.colors.success;
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headingIcon: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.successLight,
    },
    headingText: { flex: 1, gap: 2 },
    title: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 17,
      fontWeight: '600',
      color: colors.head,
    },
    subtitle: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary },
    attribution: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: -8,
    },
    scaleHint: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: -4,
    },
    mapLevelOverlay: {
      position: 'absolute',
      top: 8,
      right: 8,
      minHeight: 42,
      maxWidth: 200,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    mapLevelDot: { width: 10, height: 10, borderRadius: 5 },
    mapLevelCopy: { flexShrink: 1, gap: 1 },
    mapLevelTaxon: {
      fontFamily: fonts.sans,
      fontSize: 10,
      color: colors.textMuted,
    },
    mapLevelText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      color: colors.text,
    },
    mapLevelValue: {
      fontFamily: fonts.sans,
      fontSize: 10,
      color: colors.textMuted,
    },
    scaleRow: { flexDirection: 'row', gap: 8 },
    scaleButton: {
      flex: 1,
      minHeight: 36,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    taxonRow: { flexDirection: 'row', gap: 8 },
    taxonButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      flexDirection: 'row',
      gap: 5,
    },
    taxonButtonSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    taxonText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      color: colors.textSecondary,
    },
    taxonTextSelected: { color: colors.accent },
    profileDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
    sectionLabel: {
      marginTop: 2,
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      color: colors.textSecondary,
    },
    secondaryTaxonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    secondaryTaxonButton: {
      minHeight: 34,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    calendarCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    readingBody: { flex: 1, gap: 4 },
    readingTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    valueText: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary },
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
