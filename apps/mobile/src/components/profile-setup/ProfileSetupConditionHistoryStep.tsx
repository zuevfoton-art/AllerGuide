import { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import type { AllergyConditionId, ConditionHistoryQuestionPage } from '@allerguide/core';
import {
  ConditionHistoryEditor,
  type ConditionHistoryDrafts,
} from '@/src/components/ConditionHistoryEditor';
import { GlassCard } from '@/src/components/GlassCard';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface ProfileSetupConditionHistoryStepProps {
  conditions: AllergyConditionId[];
  drafts: ConditionHistoryDrafts;
  onChange: (drafts: ConditionHistoryDrafts) => void;
  birthYear?: string;
  page?: ConditionHistoryQuestionPage | null;
  questionProgress?: { current: number; total: number; conditionLabel: string };
}

export function ProfileSetupConditionHistoryStep({
  conditions,
  drafts,
  onChange,
  birthYear,
  page,
  questionProgress,
}: ProfileSetupConditionHistoryStepProps) {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <GlassCard style={styles.section}>
      <Text style={ui.sectionLabel}>{t('profileSetup.conditionHistory.title')}</Text>
      <Text style={styles.hint}>
        {questionProgress
          ? t('profileSetup.conditionHistory.questionProgress', {
              condition: questionProgress.conditionLabel,
              current: questionProgress.current,
              total: questionProgress.total,
            })
          : t('profileSetup.conditionHistory.hint')}
      </Text>
      <ConditionHistoryEditor
        conditionIds={conditions}
        drafts={drafts}
        onChange={onChange}
        birthYear={birthYear}
        page={page}
      />
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
  });
}
