import { PropsWithChildren, useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { density, radii } from '@/src/constants/layout';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

type GlassCardProps = PropsWithChildren<{
  style?: ViewStyle;
  padded?: boolean;
  testID?: string;
  /**
   * Soft Claro teal surface (wellness / clinical hints).
   * `calm` is a deprecated alias for `soft` (Dual Calm naming removed).
   */
  variant?: 'default' | 'soft' | 'calm';
}>;

/** Clinical card surface. */
export function GlassCard({
  children,
  style,
  padded = true,
  testID,
  variant = 'default',
}: GlassCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isSoft = variant === 'soft' || variant === 'calm';

  return (
    <View
      testID={testID}
      style={[styles.card, isSoft && styles.soft, padded && styles.padded, style]}>
      {children}
    </View>
  );
}

export const Card = GlassCard;

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      ...(shadows.sm as object),
    },
    soft: {
      backgroundColor: colors.accentLight,
      borderColor: colors.accentMid,
    },
    padded: {
      padding: density.cardPadding,
    },
  });
}
