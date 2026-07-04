import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { fontSizes } from '@/src/constants/typography';

export type DiaryHeatmapDay = {
  date: string;
  severity: number;
};

type DiaryCalendarHeatmapProps = {
  days: DiaryHeatmapDay[];
};

function severityColor(severity: number, theme: AppTheme): string {
  if (severity >= 3) return theme.colors.danger;
  if (severity >= 2) return '#E8A317';
  if (severity >= 1) return theme.colors.accent;
  return theme.colors.border;
}

export function DiaryCalendarHeatmap({ days }: DiaryCalendarHeatmapProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.grid} testID="diary-calendar-heatmap">
      {days.map((day) => (
        <View key={day.date} style={styles.cell}>
          <View
            style={[
              styles.dot,
              { backgroundColor: severityColor(day.severity, theme) },
            ]}
          />
          <Text style={styles.day}>{day.date.slice(8)}</Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    cell: {
      width: 36,
      alignItems: 'center',
      gap: 4,
    },
    dot: {
      width: 28,
      height: 28,
      borderRadius: 6,
    },
    day: {
      fontSize: fontSizes.caption,
      color: theme.colors.textMuted,
    },
  });
}
