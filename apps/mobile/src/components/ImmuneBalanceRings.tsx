import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { ImmuneBalanceRings as ImmuneBalanceRingValues } from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

const RING_SIZE = 140;
const STROKE_WIDTH = 12;
const RING_GAP = 4;

type ImmuneBalanceRingsProps = {
  rings: ImmuneBalanceRingValues;
  accessibilityLabel: string;
};

export function ImmuneBalanceRings({ rings, accessibilityLabel }: ImmuneBalanceRingsProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const center = RING_SIZE / 2;
  const series = [
    { progress: rings.pollen, color: theme.colors.ringAllergen },
    { progress: rings.air, color: theme.colors.ringMedicine },
    { progress: rings.diary, color: theme.colors.accent },
  ];

  return (
    <View
      testID="immune-balance"
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={styles.wrap}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        {series.map((ring, index) => {
          const radius = center - STROKE_WIDTH * (index + 0.5) - index * RING_GAP;
          return (
            <RingArc
              key={ring.color}
              cx={center}
              cy={center}
              r={radius}
              progress={ring.progress}
              color={ring.color}
              width={STROKE_WIDTH}
            />
          );
        })}
      </Svg>
    </View>
  );
}

function RingArc({
  cx,
  cy,
  r,
  progress,
  color,
  width,
}: {
  cx: number;
  cy: number;
  r: number;
  progress: number;
  color: string;
  width: number;
}) {
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, progress));
  const dash = (clamped / 100) * circumference;
  return (
    <>
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        stroke={`${color}30`}
        strokeWidth={width}
        fill="none"
      />
      {clamped > 0 ? (
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={color}
          strokeWidth={width}
          fill="none"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      ) : null}
    </>
  );
}

function createStyles(_theme: AppTheme) {
  return StyleSheet.create({
    wrap: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
