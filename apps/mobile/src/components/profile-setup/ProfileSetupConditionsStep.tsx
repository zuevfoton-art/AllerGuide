import { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import type { AllergyConditionId, ProfileType } from '@allerguide/core';
import { ConditionPicker } from '@/src/components/ConditionPicker';
import { GlassCard } from '@/src/components/GlassCard';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface ProfileSetupConditionsStepProps {
  selected: AllergyConditionId[];
  onChange: (selected: AllergyConditionId[]) => void;
  profileType: ProfileType;
}

export function ProfileSetupConditionsStep({
  selected,
  onChange,
  profileType,
}: ProfileSetupConditionsStepProps) {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  const question =
    profileType === 'child'
      ? t('profileSetup.conditionsQuestionChild')
      : t('profileSetup.conditionsQuestion');

  return (
    <GlassCard style={styles.section}>
      <Text style={ui.sectionLabel}>{question}</Text>
      <Text style={styles.hint}>{t('profileSetup.conditionsHint')}</Text>
      <ConditionPicker selected={selected} onChange={onChange} />
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
