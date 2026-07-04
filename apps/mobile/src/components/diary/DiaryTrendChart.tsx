import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Line } from 'react-native-svg';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { fontSizes } from '@/src/constants/typography';

export type DiaryTrendPoint = {
  date: string;
  severity: number;
};

type DiaryTrendChartProps = {
  points: DiaryTrendPoint[];
  height?: number;
};

export function DiaryTrendChart({ points, height = 120 }: DiaryTrendChartProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const width = 280;
  const padding = 8;
  const maxSeverity = 3;

  const coords = points.map((point, index) => {
    const x =
      points.length <= 1
        ? width / 2
        : padding + (index / (points.length - 1)) * (width - padding * 2);
    const y = padding + (1 - point.severity / maxSeverity) * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <View style={styles.wrap} testID="diary-trend-chart">
      <Svg width={width} height={height}>
        {[0, 1, 2, 3].map((level) => {
          const y = padding + (1 - level / maxSeverity) * (height - padding * 2);
          return (
            <Line
              key={level}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke={theme.colors.border}
              strokeWidth={1}
            />
          );
        })}
        {coords.length >= 2 ? (
          <Polyline
            points={coords.join(' ')}
            fill="none"
            stroke={theme.colors.accent}
            strokeWidth={2}
          />
        ) : null}
      </Svg>
      <View style={styles.labels}>
        {points.map((point) => (
          <Text key={point.date} style={styles.label}>
            {point.date.slice(5)}
          </Text>
        ))}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 4 },
    labels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    label: {
      fontSize: fontSizes.caption,
      color: theme.colors.textMuted,
    },
  });
}
