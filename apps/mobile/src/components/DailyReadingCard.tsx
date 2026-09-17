import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { CardTitle } from '@/src/components/CardTitle';
import { Button } from '@/src/components/Button';
import { density, radii, space } from '@/src/constants/layout';
import { fontSizes, lineHeights, scaledTextProps, textStyles } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import type { TodayReading } from '@/src/services/today-reading-service';

type DailyReadingCardProps = {
  reading: TodayReading;
  /** Rendered under the advice — the single primary next step of the screen. */
  showAction?: boolean;
};

/**
 * Daily reading on a single golden field (`warningBorder`) — no nested white card.
 * CTA stays mint primary; copy uses petrol ink.
 */
export function DailyReadingCard({ reading, showAction = true }: DailyReadingCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.field} testID="today-reading-field">
      <Text {...scaledTextProps} style={styles.eyebrow}>
        {t('today.readingTitle')}
      </Text>
      <View testID="today-reading" style={styles.bodyWrap} accessibilityRole="summary">
        <CardTitle>{reading.title}</CardTitle>
        <View style={styles.body}>
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
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    field: {
      backgroundColor: colors.warningBorder,
      borderRadius: radii.field,
      padding: density.cardPadding,
      gap: space[2],
    },
    eyebrow: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.caption,
      lineHeight: lineHeights.caption,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.warningText,
    },
    bodyWrap: {
      gap: 0,
    },
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
