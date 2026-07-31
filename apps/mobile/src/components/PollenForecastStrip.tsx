import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PollenForecastDay, PollenMapTaxonId, PollenTierLevel } from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface PollenForecastStripProps {
  days: PollenForecastDay[];
  taxonId: PollenMapTaxonId;
}

const WEEKDAY_KEYS = [
  'map.weekdaySun',
  'map.weekdayMon',
  'map.weekdayTue',
  'map.weekdayWed',
  'map.weekdayThu',
  'map.weekdayFri',
  'map.weekdaySat',
] as const;

export function PollenForecastStrip({ days, taxonId }: PollenForecastStripProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  if (days.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{t('map.forecastEmpty')}</Text>
      </View>
    );
  }

  const maxValue = Math.max(
    1,
    ...days.map(
      (day) => day.readings.find((reading) => reading.taxonId === taxonId)?.value ?? 0,
    ),
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('map.forecastTitle')}</Text>
      <View style={styles.row}>
        {days.map((day) => {
          const reading = day.readings.find((item) => item.taxonId === taxonId);
          const level = reading?.level ?? null;
          const value = reading?.value ?? 0;
          const height = 12 + Math.round((value / maxValue) * 36);
          const weekday = weekdayLabel(day.date, t);
          return (
            <View key={day.date} style={styles.day}>
              <View
                style={[
                  styles.bar,
                  {
                    height,
                    backgroundColor: levelColor(level, theme),
                  },
                ]}
              />
              <Text style={styles.weekday}>{weekday}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function weekdayLabel(date: string, t: (key: (typeof WEEKDAY_KEYS)[number]) => string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date.slice(5);
  return t(WEEKDAY_KEYS[parsed.getDay()]!);
}

function levelColor(level: PollenTierLevel | null, theme: AppTheme): string {
  if (level === 'high') return theme.colors.danger;
  if (level === 'mid') return theme.colors.warning;
  if (level === 'low') return theme.colors.success;
  return theme.colors.border;
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 10 },
    title: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      color: colors.head,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 6,
      minHeight: 64,
    },
    day: { flex: 1, alignItems: 'center', gap: 6 },
    bar: {
      width: '70%',
      maxWidth: 28,
      borderRadius: 4,
      minHeight: 12,
    },
    weekday: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
    },
    empty: {
      paddingVertical: 8,
    },
    emptyText: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}
