import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/src/components/GlassCard';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

export function LegalLinks() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <>
      <Text style={ui.sectionLabel}>{t('settings.legal')}</Text>
      <GlassCard padded={false}>
        <Pressable
          style={styles.row}
          onPress={() => router.push('/legal/privacy' as any)}
          accessibilityRole="button"
          accessibilityLabel={t('settings.privacy')}>
          <Text style={styles.rowTitle}>{t('settings.privacy')}</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable
          style={styles.row}
          onPress={() => router.push('/legal/terms' as any)}
          accessibilityRole="button"
          accessibilityLabel={t('settings.terms')}>
          <Text style={styles.rowTitle}>{t('settings.terms')}</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </Pressable>
      </GlassCard>
    </>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: 48,
    },
    rowTitle: {
      flex: 1,
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginHorizontal: 16,
    },
  });
}
