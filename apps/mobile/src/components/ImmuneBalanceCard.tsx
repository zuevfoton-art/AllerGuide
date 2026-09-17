import { useMemo } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import type { WellnessSnapshot } from '@/src/services/wellness-service';
import { GlassCard } from '@/src/components/GlassCard';
import { ImmuneBalanceRings } from '@/src/components/ImmuneBalanceRings';
import { density, radii, space } from '@/src/constants/layout';
import { fontSizes, lineHeights, scaledTextProps } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { resolveZoneColors, zoneFromWellnessLevel } from '@/src/hooks/use-zone-colors';
import { useTranslation } from '@/src/store/locale-store';
import { canShiftImmuneBalanceDay } from '@allerguide/core';
import { Ionicons } from '@expo/vector-icons';

const SWIPE_THRESHOLD = 40;

type ImmuneBalanceCardProps = {
  wellness: WellnessSnapshot;
  selectedDay: Date;
  dayLabel: string;
  onShiftDay: (delta: number) => void;
  onOpenStatus: () => void;
};

export function ImmuneBalanceCard({
  wellness,
  selectedDay,
  dayLabel,
  onShiftDay,
  onOpenStatus,
}: ImmuneBalanceCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const now = new Date();
  const canPrev = canShiftImmuneBalanceDay(selectedDay, -1, now);
  const canNext = canShiftImmuneBalanceDay(selectedDay, 1, now);
  const statusColors = resolveZoneColors(zoneFromWellnessLevel(wellness.level), theme.colors);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_evt, gesture) => {
          if (gesture.dx <= -SWIPE_THRESHOLD) onShiftDay(1);
          if (gesture.dx >= SWIPE_THRESHOLD) onShiftDay(-1);
        },
      }),
    [onShiftDay],
  );

  const ringA11y = t('home.balanceScoreA11y', {
    score: wellness.score,
    status: wellness.statusTitle,
    pollen: wellness.rings.pollen,
    air: wellness.rings.air,
    diary: wellness.rings.diary,
    clinical: wellness.rings.clinical ?? '—',
  });

  return (
    <GlassCard variant="soft" testID="immune-balance-card">
      <View style={styles.dayRow}>
        <DayArrow
          disabled={!canPrev}
          label={t('home.balancePrevDay')}
          icon="chevron-back"
          testID="immune-balance-day-prev"
          onPress={() => onShiftDay(-1)}
        />
        <Text {...scaledTextProps} style={styles.dayLabel} numberOfLines={1}>
          {dayLabel}
        </Text>
        <DayArrow
          disabled={!canNext}
          label={t('home.balanceNextDay')}
          icon="chevron-forward"
          testID="immune-balance-day-next"
          onPress={() => onShiftDay(1)}
        />
      </View>

      <View style={styles.body} {...pan.panHandlers}>
        <ImmuneBalanceRings
          score={wellness.score}
          rings={wellness.rings}
          accessibilityLabel={ringA11y}
        />
        <View style={styles.statusCol}>
          <Pressable
            testID="immune-balance-status"
            onPress={onOpenStatus}
            accessibilityRole="button"
            accessibilityLabel={t('home.balanceStatusA11y', { status: wellness.statusTitle })}
            style={[
              styles.statusBtn,
              statusColors
                ? { backgroundColor: statusColors.bg, borderColor: statusColors.border }
                : null,
            ]}
            hitSlop={8}>
            <Text
              {...scaledTextProps}
              style={[styles.statusText, statusColors ? { color: statusColors.fg } : null]}
              numberOfLines={3}>
              {wellness.statusTitle}
            </Text>
          </Pressable>
          <RingLegend color={theme.colors.accent} label={t('home.pollen')} />
          <RingLegend color={theme.colors.success} label={t('home.air')} />
          <RingLegend color={theme.colors.warning} label={t('home.diary')} />
          {wellness.rings.clinical != null ? (
            <RingLegend color={theme.colors.tipText} label={t('home.clinical')} />
          ) : null}
        </View>
      </View>
    </GlassCard>
  );
}

function DayArrow({
  disabled,
  label,
  icon,
  testID,
  onPress,
}: {
  disabled: boolean;
  label: string;
  icon: 'chevron-back' | 'chevron-forward';
  testID: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={[stylesShared.arrow, disabled ? { opacity: 0.35 } : null]}>
      <Ionicons name={icon} size={22} color={theme.colors.head} />
    </Pressable>
  );
}

function RingLegend({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={stylesShared.legendRow}>
      <View style={[stylesShared.swatch, { backgroundColor: color }]} />
      <Text {...scaledTextProps} style={[stylesShared.legendLabel, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    dayRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: space[3],
      gap: space[2],
    },
    dayLabel: {
      flex: 1,
      textAlign: 'center',
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
      fontWeight: '600',
      color: colors.head,
    },
    body: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
    },
    statusCol: {
      flex: 1,
      gap: space[2],
    },
    statusBtn: {
      minHeight: density.tapMinHeight,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      justifyContent: 'center',
    },
    statusText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      fontWeight: '600',
      color: colors.head,
    },
  });
}

const stylesShared = StyleSheet.create({
  arrow: {
    width: density.tapMinHeight,
    height: density.tapMinHeight,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 8,
    height: 8,
    borderRadius: radii.sm,
  },
  legendLabel: {
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
    flexShrink: 1,
  },
});
