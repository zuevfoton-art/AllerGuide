import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { GlassCard } from '@/src/components/GlassCard';
import { CardTitle } from '@/src/components/CardTitle';
import { Button } from '@/src/components/Button';
import { fontSizes, lineHeights, textStyles } from '@/src/constants/typography';
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

  return (
    <GlassCard testID="today-reading" variant="soft" zone={ZONE_BY_TONE[reading.tone]}>
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
    </GlassCard>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
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
