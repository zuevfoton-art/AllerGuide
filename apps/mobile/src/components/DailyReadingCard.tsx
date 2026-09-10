import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { GlassCard } from '@/src/components/GlassCard';
import { CardTitle } from '@/src/components/CardTitle';
import { Button } from '@/src/components/Button';
import { fontSizes, lineHeights, textStyles } from '@/src/constants/typography';
import { radii } from '@/src/constants/layout';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import type { TodayReading } from '@/src/services/today-reading-service';
import type { Zone } from '@/src/hooks/use-zone-colors';

/**
 * Red stays reserved for the SOS control and the «avoid» verdict (north-star §3.3),
 * so a careful day warms the surface instead of alarming it.
 */
const ZONE_BY_TONE: Record<TodayReading['tone'], Zone | null> = {
  calm: null,
  watch: 'attention',
  careful: 'attention',
};

/**
 * Decorative Calm wash — north-star N10. These hex values are atmosphere, not
 * CTA/text. Keep them in the mockup (`docs/wellness-ux-north-star.html`) and in
 * `docs/brand-claro-green.md` so a third teal does not appear.
 */
const READING_WASH_LIGHT = '#DCEEE4';
const READING_WASH_WARM = '#F7F1E6';
const READING_WASH_DARK = '#1A3A32';

type DailyReadingCardProps = {
  reading: TodayReading;
  /** Rendered under the advice — the single primary next step of the screen. */
  showAction?: boolean;
};

/**
 * The daily reading: two plain-language sentences plus one next step.
 * Replaces the score-first hero as the opening block of Today (north-star §4.1).
 */
export function DailyReadingCard({ reading, showAction = true }: DailyReadingCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const wash = theme.isDark ? READING_WASH_DARK : READING_WASH_LIGHT;
  const washWarm = theme.isDark ? READING_WASH_DARK : READING_WASH_WARM;

  return (
    <GlassCard testID="today-reading" variant="soft" zone={ZONE_BY_TONE[reading.tone]} style={styles.card}>
      <View pointerEvents="none" style={[styles.wash, { backgroundColor: wash }]} />
      <View pointerEvents="none" style={[styles.washWarm, { backgroundColor: washWarm }]} />
      <View style={styles.content}>
        <CardTitle>{reading.title}</CardTitle>
        <View accessibilityRole="summary" style={styles.body}>
          <Text style={styles.lead}>{reading.lead}</Text>
          <Text style={styles.advice}>{reading.advice}</Text>
        </View>
        {showAction ? (
          <Button
            testID="today-primary-insight"
            label={reading.action.label}
            variant="primary"
            block
            onPress={() => router.push(reading.action.href as never)}
          />
        ) : null}
      </View>
    </GlassCard>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    card: { overflow: 'hidden', position: 'relative' },
    wash: {
      position: 'absolute',
      top: -24,
      left: -16,
      width: 160,
      height: 120,
      borderRadius: radii.xl,
      opacity: 0.55,
    },
    washWarm: {
      position: 'absolute',
      right: -28,
      bottom: -36,
      width: 140,
      height: 110,
      borderRadius: radii.xl,
      opacity: 0.4,
    },
    content: { position: 'relative' },
    body: { gap: 6, marginBottom: 12 },
    lead: {
      ...textStyles.reading,
      color: colors.head,
    },
    advice: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
      color: colors.textSecondary,
    },
  });
}
