import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  computePefTrend,
  getAsthmaPlanPersonalBest,
  isAsthmaPlanConfigured,
  type AsthmaActionPlan,
} from '@allerguide/core';
import { GlassCard } from '@/src/components/GlassCard';
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
    <GlassCard variant="soft" style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="fitness" size={18} color={theme.colors.accent} />
        <Text style={ui.cardTitle}>{t('asthma.title')}</Text>
        <Pressable style={styles.editBtn} onPress={() => router.push('/asthma-action-plan' as any)}>
          <Text style={styles.editText}>{t('asthma.editPlan')}</Text>
        </Pressable>
      </View>

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

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{trend.count}</Text>
          <Text style={styles.statLabel}>{t('asthma.pef30d')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: zoneColor(trend.latestZone, theme.colors) }]}>
            {trend.latest ?? '—'}
          </Text>
          <Text style={styles.statLabel}>{t('asthma.latestPef')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: zoneColor(trend.latestZone, theme.colors) }]}>
            {trend.latestZone ? t(`asthma.zone.${trend.latestZone}`) : '—'}
          </Text>
          <Text style={styles.statLabel}>{t('asthma.zoneLabel')}</Text>
        </View>
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
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    editBtn: { marginLeft: 'auto' },
    editText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.accent,
    },
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
    statsRow: { flexDirection: 'row', gap: 8 },
    stat: {
      flex: 1,
      backgroundColor: colors.surfaceMuted,
      borderRadius: 6,
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: 'center',
      gap: 2,
    },
    statValue: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      fontWeight: '700',
      color: colors.head,
      textAlign: 'center',
    },
    statLabel: {
      fontFamily: fonts.sans,
      fontSize: 10,
      color: colors.textMuted,
      textAlign: 'center',
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
