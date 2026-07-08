import { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import type { AllergyConditionId, ComorbidityLink } from '@allerguide/core';
import { ComorbidityEditor } from '@/src/components/ComorbidityEditor';
import { GlassCard } from '@/src/components/GlassCard';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface ProfileSetupComorbidityStepProps {
  conditions: AllergyConditionId[];
  links: ComorbidityLink[];
  onChange: (links: ComorbidityLink[]) => void;
}

export function ProfileSetupComorbidityStep({
  conditions,
  links,
  onChange,
}: ProfileSetupComorbidityStepProps) {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <GlassCard style={styles.section}>
      <Text style={ui.sectionLabel}>{t('profileSetup.comorbidity.title')}</Text>
      <Text style={styles.hint}>{t('profileSetup.comorbidity.hint')}</Text>
      <ComorbidityEditor conditionIds={conditions} links={links} onChange={onChange} />
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
