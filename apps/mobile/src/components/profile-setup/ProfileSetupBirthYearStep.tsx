import { useMemo } from 'react';
import { Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/src/components/GlassCard';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface ProfileSetupBirthYearStepProps {
  birthYear: string;
  onBirthYearChange: (value: string) => void;
  showChildConsent: boolean;
  childConsent: boolean;
  onChildConsentChange: (value: boolean) => void;
}

export function ProfileSetupBirthYearStep({
  birthYear,
  onBirthYearChange,
  showChildConsent,
  childConsent,
  onChildConsentChange,
}: ProfileSetupBirthYearStepProps) {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <>
      <GlassCard style={styles.section}>
        <Text style={ui.sectionLabel}>{t('profileSetup.birthYearLabel')}</Text>
        <TextInput
          testID="profile-birth-year"
          placeholder={t('profileSetup.birthYearPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          value={birthYear}
          onChangeText={onBirthYearChange}
          keyboardType="numeric"
          style={styles.input}
        />
      </GlassCard>

      {showChildConsent ? (
        <Pressable style={styles.consentRow} onPress={() => onChildConsentChange(!childConsent)}>
          <Ionicons
            name={childConsent ? 'checkbox' : 'square-outline'}
            size={22}
            color={theme.colors.accent}
          />
          <Text style={styles.consentText}>{t('profileSetup.consent')}</Text>
        </Pressable>
      ) : null}
    </>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    section: { gap: 8 },
    input: {
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 6,
      fontSize: 16,
      fontFamily: fonts.sans,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    consentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    consentText: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
}
