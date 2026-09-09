import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { buildWeekRing, shouldOfferWeekRingNudge, type DiaryEntry } from '@allerguide/core';
import { GlassCard } from '@/src/components/GlassCard';
import { CardTitle } from '@/src/components/CardTitle';
import { Button } from '@/src/components/Button';
import { density, radii } from '@/src/constants/layout';
import { fontSizes, lineHeights } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { useAppearanceStore } from '@/src/store/appearance-store';
import { trackEvent } from '@/src/services/analytics-service';

type WeekRingCardProps = {
  entries: DiaryEntry[];
  /** Where the ring is rendered — analytics only, never PII. */
  surface: 'today' | 'journal';
};

const shownSurfaces = new Set<string>();

/**
 * Seven Monday-to-Sunday slots under the check-in (north-star §4.8).
 * Deliberately not a streak: a gap is an empty slot, never «you lost it».
 */
export function WeekRingCard({ entries, surface }: WeekRingCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, locale } = useTranslation();
  const showWeekRing = useAppearanceStore((s) => s.showWeekRing);

  const ring = useMemo(() => buildWeekRing(entries), [entries]);
  const weekdayLabels = useMemo(() => weekdayInitials(locale), [locale]);

  useEffect(() => {
    if (!showWeekRing) return;
    if (shownSurfaces.has(surface)) return;
    shownSurfaces.add(surface);
    trackEvent('week_ring_shown', { surface, logged_days: ring.loggedCount });
  }, [showWeekRing, surface, ring.loggedCount]);

  if (!showWeekRing) return null;

  return (
    <GlassCard testID="week-ring">
      <CardTitle>{t('game.weekTitle')}</CardTitle>
      <View
        style={styles.row}
        accessibilityRole="summary"
        accessibilityLabel={t('game.weekCount', { count: ring.loggedCount, total: ring.total })}>
        {ring.slots.map((slot) => (
          <View
            key={slot.index}
            testID={`week-ring-slot-${slot.index}`}
            style={[
              styles.slot,
              slot.logged && styles.slotLogged,
              slot.isToday && styles.slotToday,
              slot.isFuture && styles.slotFuture,
            ]}>
            <Text style={[styles.slotLabel, slot.logged && styles.slotLabelLogged]}>
              {weekdayLabels[slot.index]}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.count}>
        {ring.loggedCount === 0
          ? t('game.weekEmpty')
          : t('game.weekCount', { count: ring.loggedCount, total: ring.total })}
      </Text>
      {shouldOfferWeekRingNudge(ring) ? (
        <Button
          testID="week-ring-nudge"
          label={t('game.weekNudge')}
          variant="ghost"
          size="sm"
          onPress={() => router.push('/expert')}
        />
      ) : null}
    </GlassCard>
  );
}

/** Locale-aware Пн…Вс / M…S initials, Monday first. */
function weekdayInitials(locale: string): string[] {
  // 2024-01-01 was a Monday, so the offset doubles as the slot index.
  const monday = Date.UTC(2024, 0, 1);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday + index * 86_400_000);
    try {
      const short = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(day);
      return short.replace(/\.$/, '').slice(0, 2);
    } catch {
      return day.toUTCString().slice(0, 2);
    }
  });
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 6, marginBottom: 10 },
    slot: {
      flex: 1,
      minHeight: density.tapMinHeightSm,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    slotLogged: {
      backgroundColor: colors.accentLight,
      borderColor: colors.accentMid,
    },
    slotToday: { borderColor: colors.accent },
    /** Days still ahead read as neutral, not as misses. */
    slotFuture: { backgroundColor: colors.card },
    slotLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.caption,
      lineHeight: lineHeights.caption,
      fontWeight: '600',
      color: colors.textMuted,
    },
    slotLabelLogged: { color: colors.accent },
    count: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      color: colors.textSecondary,
    },
  });
}
