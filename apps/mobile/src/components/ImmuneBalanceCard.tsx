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

/**
 * Layout mirrors Figma `screen-dashboard` risk-card: centered rings + three
 * progress mini-cards (pollen / air / diary). Domain axes stay AllerGuide’s
 * immune-balance rings — not Figma’s symptoms/scanner labels.
 */
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

  const progressItems = [
    {
      key: 'pollen',
      label: t('home.pollen'),
      value: wellness.rings.pollen,
      color: theme.colors.accent,
    },
    {
      key: 'air',
      label: t('home.air'),
      value: wellness.rings.air,
      color: theme.colors.success,
    },
    {
      key: 'diary',
      label: t('home.diary'),
      value: wellness.rings.diary,
      color: theme.colors.warning,
    },
  ] as const;

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

      <View style={styles.ringsBlock} {...pan.panHandlers}>
        <ImmuneBalanceRings
          score={wellness.score}
          rings={wellness.rings}
          accessibilityLabel={ringA11y}
        />
      </View>

      <View style={styles.progressRow} testID="immune-balance-progress">
        {progressItems.map((item) => (
          <ProgressMiniCard
            key={item.key}
            label={item.label}
            value={item.value}
            color={item.color}
            track={theme.colors.mint}
            styles={styles}
          />
        ))}
      </View>

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
          numberOfLines={2}>
          {wellness.statusTitle}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.textMuted} />
      </Pressable>
    </GlassCard>
  );
}

function ProgressMiniCard({
  label,
  value,
  color,
  track,
  styles,
}: {
  label: string;
  value: number;
  color: string;
  track: string;
  styles: ReturnType<typeof createStyles>;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <View style={[styles.progressDot, { backgroundColor: color }]} />
        <Text {...scaledTextProps} style={[styles.progressPct, { color }]}>
          {clamped}%
        </Text>
      </View>
      <Text {...scaledTextProps} style={styles.progressLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={[styles.miniTrack, { backgroundColor: track }]}>
        <View style={[styles.miniFill, { width: `${clamped}%`, backgroundColor: color }]} />
      </View>
    </View>
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
    ringsBlock: {
      alignItems: 'center',
      marginBottom: space[3],
    },
    progressRow: {
      flexDirection: 'row',
      gap: space[2],
      marginBottom: space[3],
    },
    progressCard: {
      flex: 1,
      minWidth: 0,
      backgroundColor: colors.card,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: space[2],
      paddingVertical: space[2],
      gap: space[1],
    },
    progressHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[1],
    },
    progressDot: {
      width: 8,
      height: 8,
      borderRadius: radii.full,
    },
    progressPct: {
      fontFamily: fonts.sansBold,
      fontSize: fontSizes.caption,
      lineHeight: lineHeights.caption,
      fontWeight: '700',
    },
    progressLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.caption,
      lineHeight: lineHeights.caption,
      fontWeight: '600',
      color: colors.head,
    },
    miniTrack: {
      height: 4,
      borderRadius: radii.full,
      overflow: 'hidden',
      marginTop: space[1],
    },
    miniFill: {
      height: 4,
      borderRadius: radii.full,
    },
    statusBtn: {
      minHeight: density.tapMinHeight,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
    },
    statusText: {
      flex: 1,
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
});
