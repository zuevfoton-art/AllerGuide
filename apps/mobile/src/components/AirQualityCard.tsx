import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AirQualitySnapshot } from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface AirQualityCardProps {
  snapshot: AirQualitySnapshot | null;
  loading?: boolean;
}

export function AirQualityCard({ snapshot, loading }: AirQualityCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const uaqi = snapshot?.universal;
  const pm25 = snapshot?.pollutants.find((item) => item.code.toLowerCase() === 'pm25');
  const pm10 = snapshot?.pollutants.find((item) => item.code.toLowerCase() === 'pm10');
  const recommendation =
    snapshot?.healthRecommendations?.general ?? snapshot?.healthRecommendations?.sensitive;

  if (loading && !snapshot) {
    return (
      <View style={styles.card} testID="air-quality-card">
        <Text style={styles.title}>{t('map.airQualityTitle')}</Text>
        <Text style={styles.meta}>{t('map.pollenLoading')}</Text>
      </View>
    );
  }

  if (!uaqi) {
    return (
      <View style={styles.card} testID="air-quality-card">
        <Text style={styles.title}>{t('map.airQualityTitle')}</Text>
        <Text style={styles.meta}>{t('map.airQualityUnavailable')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card} testID="air-quality-card">
      <View style={styles.header}>
        <Text style={styles.title}>{t('map.airQualityTitle')}</Text>
        <Text style={[styles.aqi, { color: uaqi.color || theme.colors.accent }]}>
          {uaqi.aqiDisplay ?? String(uaqi.aqi)}
        </Text>
      </View>
      {uaqi.category ? <Text style={styles.category}>{uaqi.category}</Text> : null}
      {uaqi.dominantPollutant ? (
        <Text style={styles.meta}>
          {t('map.airQualityDominant', { pollutant: uaqi.dominantPollutant })}
        </Text>
      ) : null}
      {pm25 || pm10 ? (
        <Text style={styles.meta}>
          {[
            pm25 ? t('map.airQualityPm25', { value: formatPollutant(pm25.value) }) : null,
            pm10 ? t('map.airQualityPm10', { value: formatPollutant(pm10.value) }) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      ) : null}
      {expanded && recommendation ? (
        <Text style={styles.body}>{recommendation}</Text>
      ) : null}
      {snapshot?.local ? (
        <Text style={styles.meta}>
          {t('map.airQualityLocal', {
            name: snapshot.local.displayName ?? snapshot.local.code,
            value: String(snapshot.local.aqi),
          })}
        </Text>
      ) : null}
      <Text style={styles.meta}>{t('map.airQualitySource')}</Text>
      <Pressable
        onPress={() => setExpanded((value) => !value)}
        accessibilityRole="button"
        testID="air-quality-card-toggle">
        <Text style={styles.toggle}>
          {expanded ? t('map.airQualityCollapse') : t('map.airQualityExpand')}
        </Text>
      </Pressable>
    </View>
  );
}

function formatPollutant(value: number | null): string {
  return typeof value === 'number' ? value.toFixed(1) : '—';
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
      gap: 8,
    },
    title: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      color: colors.head,
    },
    aqi: {
      fontFamily: fonts.sansBold,
      fontSize: 22,
      color: colors.accent,
    },
    category: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      color: colors.text,
    },
    meta: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
    body: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
    },
    toggle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      color: colors.accent,
    },
  });
}
