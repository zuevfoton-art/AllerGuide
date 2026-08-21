import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  INSECT_DISCLAIMER,
  computeInsectStingSummary,
  getConsolidatedInsectList,
  type InsectActionPlan,
} from '@allerguide/core';
import { GlassCard } from '@/src/components/GlassCard';
import { CardTitle } from '@/src/components/CardTitle';
import { Button } from '@/src/components/Button';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTranslation } from '@/src/store/locale-store';
import type { DiaryEntry } from '@/src/types';

interface InsectAllergyCardProps {
  profileAllergies: string[];
  plan: InsectActionPlan | null;
  entries: DiaryEntry[];
  onLogSting: () => void;
}

export function InsectAllergyCard({
  profileAllergies,
  plan,
  entries,
  onLogSting,
}: InsectAllergyCardProps) {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const summary = useMemo(() => computeInsectStingSummary(entries, 30), [entries]);
  const insects = useMemo(
    () => getConsolidatedInsectList(profileAllergies, plan),
    [profileAllergies, plan],
  );

  return (
    <GlassCard style={styles.card}>
      <CardTitle
        icon="bug"
        action={t('insect.editPlan')}
        onAction={() => router.push('/insect-action-plan' as any)}>
        {t('insect.title')}
      </CardTitle>

      {insects.length ? (
        <Text style={styles.list}>{insects.join(', ')}</Text>
      ) : (
        <Text style={styles.hint}>{t('insect.emptyList')}</Text>
      )}

      {plan?.adrenalineLocation.trim() ? (
        <Text style={styles.meta}>
          {t('insect.adrenaline')}: {plan.adrenalineLocation.trim()}
        </Text>
      ) : null}

      <View style={ui.kpiRow}>
        <Text style={ui.kpiLabel}>{t('insect.stings30d')}</Text>
        <Text style={ui.kpiValue}>{summary.totalStings}</Text>
      </View>
      <View style={ui.kpiRow}>
        <Text style={ui.kpiLabel}>{t('insect.severe30d')}</Text>
        <Text style={ui.kpiValue}>{summary.severe}</Text>
      </View>
      <View style={ui.kpiRow}>
        <Text style={ui.kpiLabel}>{t('insect.adrenalineUsed30d')}</Text>
        <Text style={ui.kpiValue}>{summary.adrenalineUsed}</Text>
      </View>

      <Button label={t('insect.logSting')} variant="primary" size="sm" onPress={onLogSting} />
      <Text style={styles.disclaimer}>{INSECT_DISCLAIMER}</Text>
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
    list: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    meta: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
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
