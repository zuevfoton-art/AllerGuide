import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  POLLEN_UPI_FALLBACK_COLORS,
  POLLEN_UPI_MAX,
  type PollenTypeGroup,
  type PollenUpiIndex,
} from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { POLLEN_TYPE_LABEL_KEYS } from '@/src/constants/pollen-taxon-labels';

const UPI_SEGMENTS: PollenUpiIndex[] = [0, 1, 2, 3, 4, 5];

const CATEGORY_KEYS = [
  'map.upiCategoryNone',
  'map.upiCategoryVeryLow',
  'map.upiCategoryLow',
  'map.upiCategoryModerate',
  'map.upiCategoryHigh',
  'map.upiCategoryVeryHigh',
] as const;

interface PollenHeatmapLegendProps {
  group: PollenTypeGroup;
}

export function PollenHeatmapLegend({ group }: PollenHeatmapLegendProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View style={styles.wrap} testID="pollen-heatmap-legend">
      <View style={styles.badgeRow}>
        <Text style={styles.badge} testID="pollen-heatmap-group-badge">
          {t(POLLEN_TYPE_LABEL_KEYS[group] as 'map.pollenTypeTree')}
        </Text>
        <Text style={styles.official}>{t('map.heatmapOfficialGroup')}</Text>
      </View>
      <Text style={styles.title}>{t('map.heatmapLegendTitle')}</Text>
      <View style={styles.scale}>
        {UPI_SEGMENTS.map((index) => (
          <View key={index} style={styles.segment}>
            <View
              style={[styles.swatch, { backgroundColor: POLLEN_UPI_FALLBACK_COLORS[index] }]}
            />
            <Text style={styles.segmentLabel}>
              {index}/{POLLEN_UPI_MAX}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.hint}>
        {UPI_SEGMENTS.map((index) => t(CATEGORY_KEYS[index])).join(' · ')}
      </Text>
      <Text style={styles.hint}>{t('map.heatmapNoSpeciesLayer')}</Text>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    badge: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      color: colors.accent,
      backgroundColor: colors.accentLight,
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      overflow: 'hidden',
    },
    official: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
    },
    title: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      color: colors.textMuted,
    },
    scale: { flexDirection: 'row', gap: 4 },
    segment: { flex: 1, alignItems: 'center', gap: 4 },
    swatch: { width: '100%', height: 8, borderRadius: 4 },
    segmentLabel: {
      fontFamily: fonts.sans,
      fontSize: 9,
      color: colors.textMuted,
    },
    hint: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
      lineHeight: 15,
    },
  });
}
