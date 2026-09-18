import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { WellnessSnapshot } from '@/src/services/wellness-service';
import { GlassCard } from '@/src/components/GlassCard';
import { ImmuneBalanceRings } from '@/src/components/ImmuneBalanceRings';
import { SeverityBadge, type SeverityLevel } from '@/src/components/SeverityBadge';
import { radii, space } from '@/src/constants/layout';
import { fontSizes, lineHeights, scaledTextProps } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

type ImmuneBalanceCardProps = {
  wellness: WellnessSnapshot;
};

function statusSeverity(level: WellnessSnapshot['level']): SeverityLevel {
  if (level === 'good') return 'safe';
  if (level === 'moderate') return 'moderate';
  if (level === 'attention') return 'mild';
  return 'severe';
}

/**
 * Zip dashboard risk-card: rings 140 + side legend Аллергены / Лекарства / Симптомы.
 * Ring values stay wellness pollen/air/diary; labels and colors are zip.
 */
export function ImmuneBalanceCard({ wellness }: ImmuneBalanceCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const ringA11y = t('home.balanceScoreA11y', {
    score: wellness.score,
    status: wellness.statusTitle,
    pollen: wellness.rings.pollen,
    air: wellness.rings.air,
    diary: wellness.rings.diary,
    clinical: wellness.rings.clinical ?? '—',
  });

  const legend = [
    {
      key: 'allergens',
      label: t('home.ringAllergens'),
      value: wellness.rings.pollen,
      color: theme.colors.ringAllergen,
    },
    {
      key: 'medicines',
      label: t('home.ringMedicines'),
      value: wellness.rings.air,
      color: theme.colors.ringMedicine,
    },
    {
      key: 'symptoms',
      label: t('home.ringSymptoms'),
      value: wellness.rings.diary,
      color: theme.colors.accent,
    },
  ] as const;

  return (
    <GlassCard variant="soft" testID="immune-balance-card" style={styles.card}>
      <View style={styles.riskHeader}>
        <Text {...scaledTextProps} style={styles.riskTitle}>
          {t('home.dailyRisk')}
        </Text>
        <SeverityBadge severity={statusSeverity(wellness.level)} label={wellness.statusTitle} />
      </View>
      <View style={styles.riskContent}>
        <ImmuneBalanceRings
          rings={wellness.rings}
          accessibilityLabel={ringA11y}
        />
        <View style={styles.riskLegend} testID="immune-balance-progress">
          {legend.map((item) => (
            <View key={item.key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text {...scaledTextProps} style={styles.legendText}>
                {item.label} — {Math.round(item.value)}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    </GlassCard>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    card: {
      gap: space[4],
      padding: space[5],
    },
    riskHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: space[2],
    },
    riskTitle: {
      fontFamily: fonts.sansBold,
      fontSize: fontSizes.h4,
      lineHeight: lineHeights.h4,
      fontWeight: '700',
      color: colors.head,
      flex: 1,
    },
    riskContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[5],
    },
    riskLegend: { flex: 1, gap: 10 },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: radii.full,
    },
    legendText: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.label,
      lineHeight: lineHeights.label,
      color: colors.textSecondary,
      flex: 1,
    },
  });
}
