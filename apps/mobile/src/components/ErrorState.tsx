import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { radii } from '@/src/constants/layout';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

/** Inline error surface with an optional retry action. */
export function ErrorState({ message, onRetry, retryLabel }: ErrorStateProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <GlassCard>
      <View style={styles.wrap}>
        <View style={styles.iconWrap}>
          <Ionicons name="alert-circle-outline" size={24} color={theme.colors.danger} />
        </View>
        <Text style={styles.message}>{message ?? t('common.loadFailed')}</Text>
        {onRetry ? (
          <Button label={retryLabel ?? t('common.retry')} variant="secondary" size="sm" onPress={onRetry} />
        ) : null}
      </View>
    </GlassCard>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', gap: 10, paddingVertical: 8 },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: radii.md,
      backgroundColor: colors.dangerLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    message: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      textAlign: 'center',
    },
  });
}
