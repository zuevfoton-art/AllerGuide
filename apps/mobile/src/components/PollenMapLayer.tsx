import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  buildPollenRiskMapUrl,
  PRIMARY_POLLEN_MAP_TAXON_IDS,
  SECONDARY_POLLEN_MAP_TAXON_IDS,
  selectLowPollenLocations,
  type PollenMapDirection,
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

const DIRECTION_LABEL_KEYS: Record<PollenMapDirection, string> = {
  north: 'map.pollenNorth',
  northEast: 'map.pollenNorthEast',
  east: 'map.pollenEast',
  southEast: 'map.pollenSouthEast',
  south: 'map.pollenSouth',
  southWest: 'map.pollenSouthWest',
  west: 'map.pollenWest',
  northWest: 'map.pollenNorthWest',
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
  const selectedReading = snapshot?.readings.find(
    (reading) => reading.taxonId === selectedTaxonId,
  );
  const safeLocations = useMemo(
    () => selectLowPollenLocations(snapshot?.nearbyLocations ?? [], selectedTaxonId),
    [selectedTaxonId, snapshot?.nearbyLocations],
  );
  const mapUrl = useMemo(
    () =>
      buildPollenRiskMapUrl({
        center: { latitude, longitude },
        points: (snapshot?.nearbyLocations ?? []).flatMap((location) => {
          const reading = location.readings.find((item) => item.taxonId === selectedTaxonId);
          return reading
            ? [{ latitude: location.latitude, longitude: location.longitude, level: reading.level }]
            : [];
        }),
      }),
    [latitude, longitude, selectedTaxonId, snapshot?.nearbyLocations],
  );
  const isCalendarFallback = snapshot?.source === 'calendar';

  const levelColor = selectedReading
    ? getLevelColor(selectedReading.level, theme)
    : theme.colors.textMuted;
  const levelBackground = selectedReading
    ? getLevelBackground(selectedReading.level, theme)
    : theme.colors.surfaceMuted;

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

      <YandexMap
        url={mapUrl}
        height={300}
        overlay={
          <View style={styles.mapLevelOverlay}>
            <View style={[styles.mapLevelDot, { backgroundColor: levelColor }]} />
            <Text style={styles.mapLevelText}>
              {selectedReading
                ? t(LEVEL_LABEL_KEYS[selectedReading.level])
                : t('map.pollenUnavailable')}
            </Text>
          </View>
        }
      />
      <Text style={styles.attribution}>{t('map.pollenMapAttribution')}</Text>
      <View style={styles.legendRow}>
        <LegendItem color={theme.colors.accent} label={t('map.pollenYou')} styles={styles} />
        <LegendItem color={theme.colors.success} label={t('map.pollenLow')} styles={styles} />
        <LegendItem color={theme.colors.warning} label={t('map.pollenModerate')} styles={styles} />
        <LegendItem color={theme.colors.danger} label={t('map.pollenHigh')} styles={styles} />
      </View>

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

      {!snapshot ? (
        <GlassCard style={styles.statusCard}>
          <Text style={styles.statusText}>{t('map.pollenLoading')}</Text>
        </GlassCard>
      ) : null}

      {snapshot && !isCalendarFallback ? (
        <GlassCard style={styles.readingCard}>
          <View style={[styles.levelIcon, { backgroundColor: levelBackground }]}>
            <Ionicons name="flower-outline" size={24} color={levelColor} />
          </View>
          <View style={styles.readingBody}>
            <View style={styles.readingTitleRow}>
              <Text style={styles.readingTitle}>{t(TAXON_LABEL_KEYS[selectedTaxonId])}</Text>
              {selectedReading?.profileRelevant ? (
                <Text style={styles.profileLabel}>{t('map.pollenForYou')}</Text>
              ) : null}
            </View>
            {selectedReading ? (
              <>
                <Text style={[styles.levelText, { color: levelColor }]}>
                  {t(LEVEL_LABEL_KEYS[selectedReading.level])}
                </Text>
                <Text style={styles.valueText}>
                  {t('map.pollenValue', { value: selectedReading.value.toFixed(1) })}
                </Text>
              </>
            ) : (
              <Text style={styles.unavailableText}>{t('map.pollenUnavailable')}</Text>
            )}
            <Text style={styles.sourceText}>
              {snapshot.source === 'cache'
                ? t('map.pollenSourceCache')
                : t('map.pollenSourceOpenMeteo')}
            </Text>
          </View>
        </GlassCard>
      ) : null}

      {snapshot && !isCalendarFallback ? (
        <View style={styles.safeSection}>
          <View style={styles.safeHeading}>
            <Ionicons name="navigate-circle-outline" size={22} color={theme.colors.success} />
            <View style={styles.readingBody}>
              <Text style={styles.readingTitle}>{t('map.safePollenPlaces')}</Text>
              <Text style={styles.safeHint}>{t('map.safePollenPlacesHint')}</Text>
            </View>
          </View>
          {safeLocations.length > 0 ? (
            safeLocations.map((location) => {
              const reading = location.readings.find(
                (item) => item.taxonId === selectedTaxonId,
              );
              return (
                <GlassCard
                  key={`${location.latitude}-${location.longitude}`}
                  style={styles.safeCard}>
                  <View style={styles.safeMarker}>
                    <Ionicons name="leaf-outline" size={18} color={theme.colors.success} />
                  </View>
                  <View style={styles.readingBody}>
                    <Text style={styles.safeTitle}>
                      {t(DIRECTION_LABEL_KEYS[location.direction])} ·{' '}
                      {t('map.pollenDistance', { distance: location.distanceKm })}
                    </Text>
                    <Text style={styles.valueText}>
                      {t('map.pollenValue', { value: reading?.value.toFixed(1) ?? '—' })}
                    </Text>
                  </View>
                  <Text style={styles.lowBadge}>{t('map.pollenLow')}</Text>
                </GlassCard>
              );
            })
          ) : (
            <Text style={styles.unavailableText}>{t('map.noSafePollenPlaces')}</Text>
          )}
        </View>
      ) : null}

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

function LegendItem({
  color,
  label,
  styles,
}: {
  color: string;
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function getLevelColor(level: PollenTierLevel, theme: AppTheme): string {
  if (level === 'high') return theme.colors.danger;
  if (level === 'mid') return theme.colors.warning;
  return theme.colors.success;
}

function getLevelBackground(level: PollenTierLevel, theme: AppTheme): string {
  if (level === 'high') return theme.colors.dangerLight;
  if (level === 'mid') return theme.colors.warningLight;
  return theme.colors.successLight;
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
    mapLevelOverlay: {
      minHeight: 34,
      maxWidth: 170,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    mapLevelDot: { width: 9, height: 9, borderRadius: 5 },
    mapLevelText: {
      flexShrink: 1,
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      color: colors.text,
    },
    legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 7, height: 7, borderRadius: 4 },
    legendText: { fontFamily: fonts.sans, fontSize: 10, color: colors.textMuted },
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
    statusCard: { alignItems: 'center', justifyContent: 'center' },
    statusText: { fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted },
    readingCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    calendarCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
    levelIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    readingBody: { flex: 1, gap: 4 },
    readingTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    readingTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    profileLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 10,
      color: colors.accent,
      backgroundColor: colors.accentLight,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    levelText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
    },
    valueText: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary },
    unavailableText: { fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted },
    sourceText: { fontFamily: fonts.sans, fontSize: 10, color: colors.textMuted },
    safeSection: { gap: 8 },
    safeHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    safeHint: {
      fontFamily: fonts.sans,
      fontSize: 11,
      lineHeight: 15,
      color: colors.textMuted,
    },
    safeCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    safeMarker: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.successLight,
    },
    safeTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      color: colors.text,
    },
    lowBadge: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 10,
      color: colors.success,
      backgroundColor: colors.successLight,
      borderRadius: 5,
      paddingHorizontal: 7,
      paddingVertical: 3,
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
