import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  INSECT_DISCLAIMER,
  computeInsectStingSummary,
  getConsolidatedInsectList,
  type InsectActionPlan,
} from '@allerguide/core';
import { GlassCard } from '@/src/components/GlassCard';
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
      <View style={styles.headerRow}>
        <Ionicons name="bug" size={18} color={theme.colors.accent} />
        <Text style={ui.cardTitle}>{t('insect.title')}</Text>
        <Pressable style={styles.editBtn} onPress={() => router.push('/insect-action-plan' as any)}>
          <Text style={styles.editText}>{t('insect.editPlan')}</Text>
        </Pressable>
      </View>

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

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.totalStings}</Text>
          <Text style={styles.statLabel}>{t('insect.stings30d')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.severe}</Text>
          <Text style={styles.statLabel}>{t('insect.severe30d')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.adrenalineUsed}</Text>
          <Text style={styles.statLabel}>{t('insect.adrenalineUsed30d')}</Text>
        </View>
      </View>

      <Button label={t('insect.logSting')} variant="primary" size="sm" onPress={onLogSting} />
      <Text style={styles.disclaimer}>{INSECT_DISCLAIMER}</Text>
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
      fontSize: 18,
      fontWeight: '700',
      color: colors.head,
    },
    statLabel: {
      fontFamily: fonts.sans,
      fontSize: 10,
      color: colors.textMuted,
      textAlign: 'center',
    },
    disclaimer: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
      lineHeight: 15,
    },
  });
}
