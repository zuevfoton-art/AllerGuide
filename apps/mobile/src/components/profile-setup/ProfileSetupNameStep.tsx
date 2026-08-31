import { useMemo } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ProfileType } from '@allerguide/core';
import { GlassCard } from '@/src/components/GlassCard';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface ProfileSetupNameStepProps {
  name: string;
  onNameChange: (value: string) => void;
  profileType: ProfileType;
  onProfileTypeChange: (value: ProfileType) => void;
  canToggleType: boolean;
}

export function ProfileSetupNameStep({
  name,
  onNameChange,
  profileType,
  onProfileTypeChange,
  canToggleType,
}: ProfileSetupNameStepProps) {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <GlassCard style={styles.section}>
      <Text style={ui.sectionLabel}>{t('profileSetup.nameLabel')}</Text>
      <TextInput
        testID="profile-name"
        value={name}
        onChangeText={onNameChange}
        style={styles.input}
      />

      {/* Locked profile type needs no badge: the screen title already names it. */}
      {canToggleType ? (
        <>
          <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('profileSetup.profileLabel')}</Text>
          <View style={ui.toggleRow}>
            <Pressable
              style={[ui.toggle, profileType === 'self' && ui.toggleActive]}
              onPress={() => onProfileTypeChange('self')}>
              <Ionicons
                name="person"
                size={16}
                color={profileType === 'self' ? theme.colors.onAccent : theme.colors.textMuted}
              />
              <Text style={[ui.toggleText, profileType === 'self' && ui.toggleTextActive]}>
                {t('profileSetup.profileSelf')}
              </Text>
            </Pressable>
            <Pressable
              style={[ui.toggle, profileType === 'child' && ui.toggleActive]}
              onPress={() => onProfileTypeChange('child')}>
              <Ionicons
                name="happy"
                size={16}
                color={profileType === 'child' ? theme.colors.onAccent : theme.colors.textMuted}
              />
              <Text style={[ui.toggleText, profileType === 'child' && ui.toggleTextActive]}>
                {t('profileSetup.profileChild')}
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </GlassCard>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    section: { gap: 8 },
    fieldGap: { marginTop: 12 },
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
  });
}
