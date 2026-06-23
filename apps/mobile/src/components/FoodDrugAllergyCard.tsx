import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  FOOD_DRUG_DISCLAIMER,
  computeFoodDrugSummary,
  getConsolidatedFoodAvoidList,
  type FoodDrugRegistry,
} from '@allerguide/core';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTranslation } from '@/src/store/locale-store';
import type { DiaryEntry } from '@/src/types';

interface FoodDrugAllergyCardProps {
  mode: 'food' | 'drug';
  profileAllergies: string[];
  drugIntolerances: string[];
  registry: FoodDrugRegistry | null;
  entries: DiaryEntry[];
  onLogFood: () => void;
  onLogMedicine: () => void;
}

export function FoodDrugAllergyCard({
  mode,
  profileAllergies,
  drugIntolerances,
  registry,
  entries,
  onLogFood,
  onLogMedicine,
}: FoodDrugAllergyCardProps) {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const summary = useMemo(() => computeFoodDrugSummary(entries, 30), [entries]);
  const avoidFoods = useMemo(
    () => getConsolidatedFoodAvoidList(profileAllergies, registry),
    [profileAllergies, registry],
  );

  if (mode === 'food') {
    return (
      <GlassCard style={styles.card}>
        <View style={styles.headerRow}>
          <Ionicons name="restaurant" size={18} color={theme.colors.accent} />
          <Text style={ui.cardTitle}>{t('foodDrug.foodTitle')}</Text>
          <Pressable style={styles.editBtn} onPress={() => router.push('/food-drug-registry' as any)}>
            <Text style={styles.editText}>{t('foodDrug.editRegistry')}</Text>
          </Pressable>
        </View>

        {avoidFoods.length ? (
          <Text style={styles.list}>{avoidFoods.join(', ')}</Text>
        ) : (
          <Text style={styles.hint}>{t('foodDrug.emptyFoodList')}</Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{summary.foodEntries}</Text>
            <Text style={styles.statLabel}>{t('foodDrug.foodEntries30d')}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{summary.foodReactions.severe + summary.foodReactions.moderate}</Text>
            <Text style={styles.statLabel}>{t('foodDrug.foodReactions30d')}</Text>
          </View>
        </View>

        <Button label={t('foodDrug.logFood')} variant="primary" size="sm" onPress={onLogFood} />
        <Text style={styles.disclaimer}>{FOOD_DRUG_DISCLAIMER}</Text>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons name="medkit" size={18} color={theme.colors.accent} />
        <Text style={ui.cardTitle}>{t('foodDrug.drugTitle')}</Text>
        <Pressable style={styles.editBtn} onPress={() => router.push('/sos-edit' as any)}>
          <Text style={styles.editText}>{t('foodDrug.editSos')}</Text>
        </Pressable>
      </View>

      {drugIntolerances.length ? (
        <Text style={styles.list}>{drugIntolerances.join(', ')}</Text>
      ) : (
        <Text style={styles.hint}>{t('foodDrug.emptyDrugList')}</Text>
      )}

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.drugEntries}</Text>
          <Text style={styles.statLabel}>{t('foodDrug.drugEntries30d')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{summary.drugWarnings}</Text>
          <Text style={styles.statLabel}>{t('foodDrug.drugWarnings30d')}</Text>
        </View>
      </View>

      <Button label={t('foodDrug.logMedicine')} variant="primary" size="sm" onPress={onLogMedicine} />
      <Text style={styles.disclaimer}>{FOOD_DRUG_DISCLAIMER}</Text>
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
