import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BrandField } from '@/src/components/brand/BrandField';
import { GlassCard } from '@/src/components/GlassCard';
import { CardTitle } from '@/src/components/CardTitle';
import { Button } from '@/src/components/Button';
import { fontSizes, lineHeights, textStyles } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import type { TodayReading } from '@/src/services/today-reading-service';

type DailyReadingCardProps = {
  reading: TodayReading;
  /** Rendered under the advice — the single primary next step of the screen. */
  showAction?: boolean;
};

/**
 * Daily reading wrapped in a recognition BrandField (50% green hero).
 * Inner card stays the functional white surface for the CTA.
 */
export function DailyReadingCard({ reading, showAction = true }: DailyReadingCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <BrandField tone="recognition" eyebrow={t('today.readingTitle')} testID="today-reading-field">
      <GlassCard testID="today-reading" style={styles.card}>
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
    </BrandField>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    card: {},
    content: { gap: 0 },
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
