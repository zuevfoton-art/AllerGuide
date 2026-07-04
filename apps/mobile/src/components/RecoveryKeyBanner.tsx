import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CLOUD_SYNC_ENABLED } from '@/src/constants/features';
import {
  hasRecoveryKey,
  isRecoveryKeyConfirmed,
  usesLegacyDeviceKeyOnly,
} from '@/src/services/backup-crypto';
import { useTranslation } from '@/src/store/locale-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { fontSizes } from '@/src/constants/typography';

type RecoveryKeyBannerProps = {
  onSetupPress?: () => void;
};

export function RecoveryKeyBanner({ onSetupPress }: RecoveryKeyBannerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  if (!CLOUD_SYNC_ENABLED) return null;

  const needsSetup =
    usesLegacyDeviceKeyOnly() || !hasRecoveryKey() || (hasRecoveryKey() && !isRecoveryKeyConfirmed());

  if (!needsSetup) return null;

  return (
    <Pressable
      style={styles.banner}
      onPress={onSetupPress}
      accessibilityRole="button"
      testID="recovery-key-banner">
      <Ionicons name="key-outline" size={20} color={theme.colors.accent} />
      <View style={styles.body}>
        <Text style={styles.title}>{t('settings.recoveryKeyBannerTitle')}</Text>
        <Text style={styles.desc}>{t('settings.recoveryKeyBannerDesc')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentLight,
      marginBottom: 12,
    },
    body: { flex: 1, gap: 4 },
    title: {
      fontSize: fontSizes.bodySm,
      fontWeight: '600',
      color: theme.colors.text,
    },
    desc: {
      fontSize: fontSizes.caption,
      color: theme.colors.textMuted,
      lineHeight: 18,
    },
  });
}
