import { PropsWithChildren, useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { radii, space } from '@/src/constants/layout';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

type GlassCardProps = PropsWithChildren<{
  style?: ViewStyle;
  padded?: boolean;
}>;

/** Clinical Calm card surface (formerly GlassCard). */
export function GlassCard({ children, style, padded = true }: GlassCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
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
    padded: {
      padding: space[4],
    },
  });
}
