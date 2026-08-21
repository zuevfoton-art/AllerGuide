import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  POLLEN_UPI_FALLBACK_COLORS,
  POLLEN_UPI_MAX,
  resolvePollenUpiDisplay,
  type PollenUpiIndex,
  type PollenUpiSnapshot,
} from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useZoneColors, type Zone } from '@/src/hooks/use-zone-colors';
import { useTranslation } from '@/src/store/locale-store';

const UPI_SEGMENTS: PollenUpiIndex[] = [0, 1, 2, 3, 4, 5];

const CATEGORY_KEYS = {
  none: 'map.upiCategoryNone',
  very_low: 'map.upiCategoryVeryLow',
  low: 'map.upiCategoryLow',
  moderate: 'map.upiCategoryModerate',
  high: 'map.upiCategoryHigh',
  very_high: 'map.upiCategoryVeryHigh',
} as const;

interface PollenIndexCardProps {
  taxonLabel: string;
  upi: PollenUpiSnapshot | null;
  grainsPerM3?: number | null;
  zone?: Zone | null;
}

export function PollenIndexCard({ taxonLabel, upi, grainsPerM3, zone }: PollenIndexCardProps) {
  const theme = useTheme();
  const zoneColors = useZoneColors(zone);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  if (!upi) {
    return (
      <View style={styles.card} testID="pollen-index-card">
        <Text style={styles.title}>{t('map.upiTitle')}</Text>
        <Text style={styles.subtitle}>{taxonLabel}</Text>
        <Text style={styles.meta}>{t('map.pollenUnavailable')}</Text>
      </View>
    );
  }

  const display = resolvePollenUpiDisplay(upi);
  const categoryLabel = t(CATEGORY_KEYS[display.category]);

  return (
    <View style={styles.card} testID="pollen-index-card">
      <View style={styles.header}>
        <Text style={styles.title}>{t('map.upiTitle')}</Text>
        <Text style={[styles.value, { color: zoneColors?.fg ?? display.color }]}>
          {display.index}/{POLLEN_UPI_MAX}
        </Text>
      </View>
      <Text style={[styles.subtitle, { color: zoneColors?.fg ?? display.color }]}>
        {taxonLabel} · {categoryLabel}
      </Text>
      <View style={styles.scale} accessibilityRole="adjustable">
        {UPI_SEGMENTS.map((index) => (
          <View
            key={index}
            style={[
              styles.segment,
              {
                backgroundColor: POLLEN_UPI_FALLBACK_COLORS[index],
                opacity: index === display.index ? 1 : 0.35,
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.meta}>{t('map.upiLevelDescription', { category: categoryLabel })}</Text>
      {typeof grainsPerM3 === 'number' && upi.source !== 'google' ? (
        <Text style={styles.meta}>
          {t('map.pollenValue', { value: grainsPerM3.toFixed(1) })}
        </Text>
      ) : null}
      <Text style={styles.meta}>
        {upi.source === 'google' ? t('map.upiSourceGoogle') : t('map.upiSourceOpenMeteo')}
      </Text>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    card: {
      gap: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      color: colors.head,
    },
    value: {
      fontFamily: fonts.sansBold,
      fontSize: 20,
      color: colors.head,
    },
    subtitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
    },
    scale: { flexDirection: 'row', gap: 3, height: 8 },
    segment: { flex: 1, borderRadius: 4 },
    meta: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
    },
  });
}
