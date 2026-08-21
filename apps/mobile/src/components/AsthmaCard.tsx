import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  computePefTrend,
  getAsthmaPlanPersonalBest,
  isAsthmaPlanConfigured,
  type AsthmaActionPlan,
} from '@allerguide/core';
import { GlassCard } from '@/src/components/GlassCard';
import { CardTitle } from '@/src/components/CardTitle';
import { Button } from '@/src/components/Button';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTranslation } from '@/src/store/locale-store';
import type { DiaryEntry } from '@/src/types';

interface AsthmaCardProps {
  plan: AsthmaActionPlan | null;
  entries: DiaryEntry[];
  onLogPef: () => void;
}

function zoneColor(zone: 'green' | 'yellow' | 'red' | null, colors: AppTheme['colors']) {
  if (zone === 'green') return colors.success;
  if (zone === 'yellow') return colors.warning;
  if (zone === 'red') return colors.danger;
  return colors.textMuted;
}

export function AsthmaCard({ plan, entries, onLogPef }: AsthmaCardProps) {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const planBest = getAsthmaPlanPersonalBest(plan);
  const trend = useMemo(
    () => computePefTrend(entries, { planPersonalBest: planBest }),
    [entries, planBest],
  );
  const configured = isAsthmaPlanConfigured(plan);

  return (
    <GlassCard style={styles.card}>
      <CardTitle
        icon="fitness"
        action={t('asthma.editPlan')}
        onAction={() => router.push('/asthma-action-plan' as any)}>
        {t('asthma.title')}
      </CardTitle>

      {!configured ? (
        <Text style={styles.hint}>{t('asthma.emptyPlan')}</Text>
      ) : (
        <>
          {planBest ? (
            <Text style={styles.meta}>
              {t('asthma.personalBest')}: {planBest} {t('asthma.lPerMin')}
            </Text>
          ) : null}
          {plan?.relieverMedication.trim() ? (
            <Text style={styles.meta}>
              {t('asthma.reliever')}: {plan.relieverMedication.trim()}
            </Text>
          ) : null}
        </>
      )}

      <View style={ui.kpiRow}>
        <Text style={ui.kpiLabel}>{t('asthma.pef30d')}</Text>
        <Text style={ui.kpiValue}>{trend.count}</Text>
      </View>
      <View style={ui.kpiRow}>
        <Text style={ui.kpiLabel}>{t('asthma.latestPef')}</Text>
        <Text style={[ui.kpiValue, { color: zoneColor(trend.latestZone, theme.colors) }]}>
          {trend.latest ?? '—'}
        </Text>
      </View>
      <View style={ui.kpiRow}>
        <Text style={ui.kpiLabel}>{t('asthma.zoneLabel')}</Text>
        <Text style={[ui.kpiValue, { color: zoneColor(trend.latestZone, theme.colors) }]}>
          {trend.latestZone ? t(`asthma.zone.${trend.latestZone}`) : '—'}
        </Text>
      </View>

      {trend.latestZone && trend.latestPercentOfBest != null ? (
        <Text style={styles.zoneHint}>
          {t('asthma.zoneSummary', {
            zone: t(`asthma.zone.${trend.latestZone}`),
            percent: trend.latestPercentOfBest,
          })}
        </Text>
      ) : null}

      <Button label={t('asthma.logPef')} variant="primary" size="sm" onPress={onLogPef} />
      <Text style={styles.disclaimer}>{t('asthma.cardDisclaimer')}</Text>
    </GlassCard>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    card: { gap: 10 },
    hint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    meta: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
    },
    zoneHint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 17,
    },
    disclaimer: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
      lineHeight: 15,
    },
  });
}
