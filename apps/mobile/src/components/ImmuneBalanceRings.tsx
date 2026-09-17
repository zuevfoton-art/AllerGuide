import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { ImmuneBalanceRings as ImmuneBalanceRingValues } from '@allerguide/core';
import { density } from '@/src/constants/layout';
import { scaledTextProps, textStyles } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

const RING_SIZE = 168;
const RING_STROKES = {
  outer: 11,
  mid: 11,
  inner: 11,
  clinical: 9,
} as const;

type ImmuneBalanceRingsProps = {
  score: number;
  rings: ImmuneBalanceRingValues;
  accessibilityLabel: string;
};

export function ImmuneBalanceRings({ score, rings, accessibilityLabel }: ImmuneBalanceRingsProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const showClinical = rings.clinical != null;
  const center = RING_SIZE / 2;
  const radii = showClinical
    ? { pollen: 74, air: 58, diary: 42, clinical: 26 }
    : { pollen: 70, air: 52, diary: 34, clinical: 0 };

  return (
    <View
      testID="immune-balance"
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={styles.wrap}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <RingArc
          cx={center}
          cy={center}
          r={radii.pollen}
          progress={rings.pollen}
          color={theme.colors.accent}
          track={theme.colors.accentLight}
          width={RING_STROKES.outer}
        />
        <RingArc
          cx={center}
          cy={center}
          r={radii.air}
          progress={rings.air}
          color={theme.colors.success}
          track={theme.colors.successLight}
          width={RING_STROKES.mid}
        />
        <RingArc
          cx={center}
          cy={center}
          r={radii.diary}
          progress={rings.diary}
          color={theme.colors.warning}
          track={theme.colors.warningLight}
          width={RING_STROKES.inner}
        />
        {showClinical ? (
          <RingArc
            cx={center}
            cy={center}
            r={radii.clinical}
            progress={rings.clinical ?? 0}
            color={theme.colors.tipText}
            track={theme.colors.accentLight}
            width={RING_STROKES.clinical}
          />
        ) : null}
      </Svg>
      <View pointerEvents="none" style={styles.scoreWrap}>
        <Text {...scaledTextProps} testID="immune-balance-score" style={styles.score}>
          {score}
        </Text>
      </View>
    </View>
  );
}

function RingArc({
  cx,
  cy,
  r,
  progress,
  color,
  track,
  width,
}: {
  cx: number;
  cy: number;
  r: number;
  progress: number;
  color: string;
  track: string;
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
        stroke={track}
        strokeWidth={width}
        fill="none"
      />
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
    </>
  );
}

function createStyles({ colors }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scoreWrap: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    score: {
      ...textStyles.kpi,
      color: colors.head,
      minHeight: density.tapMinHeight,
    },
  });
}
