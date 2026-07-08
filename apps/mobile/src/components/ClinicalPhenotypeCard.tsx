import { useMemo } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import {
  buildConditionHistoryFromOnboarding,
  resolveClinicalPhenotypes,
  type AllergyConditionId,
  type ComorbidityLink,
  type ProfileType,
} from '@allerguide/core';
import type { ConditionHistoryDrafts } from '@/src/components/ConditionHistoryEditor';
import { GlassCard } from '@/src/components/GlassCard';
import { Disclaimer } from '@/src/components/Disclaimer';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface ClinicalPhenotypeCardProps {
  conditionIds: AllergyConditionId[];
  conditionHistoryDrafts: ConditionHistoryDrafts;
  comorbidityLinks: ComorbidityLink[];
  allergenIds: string[];
  profileType: ProfileType;
  birthYear?: number;
  anaphylaxisHistory?: boolean;
}

export function ClinicalPhenotypeCard({
  conditionIds,
  conditionHistoryDrafts,
  comorbidityLinks,
  allergenIds,
  profileType,
  birthYear,
  anaphylaxisHistory,
}: ClinicalPhenotypeCardProps) {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const result = useMemo(
    () =>
      resolveClinicalPhenotypes({
        conditionIds,
        history: buildConditionHistoryFromOnboarding(
          conditionIds,
          conditionHistoryDrafts,
          comorbidityLinks,
        ),
        comorbidityLinks,
        allergenIds,
        profileType,
        birthYear,
        anaphylaxisHistory,
      }),
    [
      allergenIds,
      anaphylaxisHistory,
      birthYear,
      comorbidityLinks,
      conditionHistoryDrafts,
      conditionIds,
      profileType,
    ],
  );

  return (
    <GlassCard variant="calm" style={styles.section}>
      <Text style={ui.sectionLabel}>{t('profileSetup.phenotype.title')}</Text>
      <Text style={styles.hint}>{t('profileSetup.phenotype.hint')}</Text>

      {result.phenotypes.length ? (
        <View style={styles.list}>
          {result.phenotypes.map((item) => (
            <View key={item.id} style={styles.item}>
              <Text style={styles.itemTitle}>{item.label}</Text>
              <Text style={styles.itemSource}>{item.source}</Text>
              <Text style={styles.itemDesc}>{item.description}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>{t('profileSetup.phenotype.empty')}</Text>
      )}

      {result.reassessmentHints.length ? (
        <View style={styles.hints}>
          {result.reassessmentHints.map((hint) => (
            <Text key={hint} style={styles.hintItem}>
              • {hint}
            </Text>
          ))}
        </View>
      ) : null}

      <Disclaimer>{t('profileSetup.phenotype.disclaimer')}</Disclaimer>
    </GlassCard>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    section: { gap: 8 },
    hint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    list: { gap: 10 },
    item: {
      gap: 4,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.card,
    },
    itemTitle: {
      fontFamily: fonts.sansMedium,
      fontSize: 15,
      color: colors.text,
    },
    itemSource: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.accent,
    },
    itemDesc: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    empty: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
    },
    hints: { gap: 6 },
    hintItem: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
    },
  });
}
