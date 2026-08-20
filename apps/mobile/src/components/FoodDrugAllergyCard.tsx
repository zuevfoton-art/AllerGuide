import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  FOOD_DRUG_DISCLAIMER,
  computeFoodDrugSummary,
  getConsolidatedFoodAvoidList,
  type FoodDrugRegistry,
} from '@allerguide/core';
import { GlassCard } from '@/src/components/GlassCard';
import { CardTitle } from '@/src/components/CardTitle';
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
        <CardTitle
          icon="restaurant"
          action={t('foodDrug.editRegistry')}
          onAction={() => router.push('/food-drug-registry' as any)}>
          {t('foodDrug.foodTitle')}
        </CardTitle>

        {avoidFoods.length ? (
          <Text style={styles.list}>{avoidFoods.join(', ')}</Text>
        ) : (
          <Text style={styles.hint}>{t('foodDrug.emptyFoodList')}</Text>
        )}

        <View style={ui.kpiRow}>
          <Text style={ui.kpiLabel}>{t('foodDrug.foodEntries30d')}</Text>
          <Text style={ui.kpiValue}>{summary.foodEntries}</Text>
        </View>
        <View style={ui.kpiRow}>
          <Text style={ui.kpiLabel}>{t('foodDrug.foodReactions30d')}</Text>
          <Text style={ui.kpiValue}>{summary.foodReactions.severe + summary.foodReactions.moderate}</Text>
        </View>

        <Button
          testID="diary-chip-food"
          label={t('foodDrug.logFood')}
          variant="primary"
          size="sm"
          onPress={onLogFood}
        />
        <Text style={styles.disclaimer}>{FOOD_DRUG_DISCLAIMER}</Text>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={styles.card}>
      <CardTitle
        icon="medkit"
        action={t('foodDrug.editSos')}
        onAction={() => router.push('/sos-edit' as any)}>
        {t('foodDrug.drugTitle')}
      </CardTitle>

      {drugIntolerances.length ? (
        <Text style={styles.list}>{drugIntolerances.join(', ')}</Text>
      ) : (
        <Text style={styles.hint}>{t('foodDrug.emptyDrugList')}</Text>
      )}

      <View style={ui.kpiRow}>
        <Text style={ui.kpiLabel}>{t('foodDrug.drugEntries30d')}</Text>
        <Text style={ui.kpiValue}>{summary.drugEntries}</Text>
      </View>
      <View style={ui.kpiRow}>
        <Text style={ui.kpiLabel}>{t('foodDrug.drugWarnings30d')}</Text>
        <Text style={ui.kpiValue}>{summary.drugWarnings}</Text>
      </View>

      <Button label={t('foodDrug.logMedicine')} variant="primary" size="sm" onPress={onLogMedicine} />
      <Text style={styles.disclaimer}>{FOOD_DRUG_DISCLAIMER}</Text>
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
    disclaimer: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
      lineHeight: 15,
    },
  });
}
