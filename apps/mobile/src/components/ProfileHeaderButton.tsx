import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

export function ProfileHeaderButton() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <Pressable
      style={styles.button}
      onPress={() => router.push('/profile')}
      accessibilityRole="button"
      accessibilityLabel={t('profileSwitcher.manage')}>
      <Ionicons name="person-circle-outline" size={20} color={theme.colors.accent} />
    </Pressable>
  );
}

function createStyles({ colors }: AppTheme) {
  return StyleSheet.create({
    button: {
      width: 40,
      height: 40,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
