import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

const UAQI_STOPS = [
  { value: 0, color: '#B71C1C' },
  { value: 20, color: '#E53935' },
  { value: 40, color: '#FB8C00' },
  { value: 60, color: '#FDD835' },
  { value: 80, color: '#7CB342' },
  { value: 100, color: '#2E7D32' },
];

export function AirQualityLegend() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View style={styles.wrap} testID="air-quality-legend">
      <Text style={styles.title}>{t('map.airQualityLegend')}</Text>
      <View style={styles.scale}>
        {UAQI_STOPS.map((stop) => (
          <View key={stop.value} style={[styles.swatch, { backgroundColor: stop.color }]} />
        ))}
      </View>
      <View style={styles.labels}>
        <Text style={styles.label}>0</Text>
        <Text style={styles.label}>{t('map.airQualityLegendDirection')}</Text>
        <Text style={styles.label}>100</Text>
      </View>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    title: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      color: colors.textMuted,
    },
    scale: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
    swatch: { flex: 1 },
    labels: { flexDirection: 'row', justifyContent: 'space-between' },
    label: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
    },
  });
}
