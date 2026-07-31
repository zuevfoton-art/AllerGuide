import { PropsWithChildren, useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { radii, space } from '@/src/constants/layout';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

type GlassCardProps = PropsWithChildren<{
  style?: ViewStyle;
  padded?: boolean;
  testID?: string;
  /**
   * Soft Claro teal surface (wellness / clinical hints).
   * Wired to product `accentLight` / `accentMid` — not medical blue.
   */
  variant?: 'default' | 'calm';
}>;

/** Clinical card surface (formerly GlassCard). */
export function GlassCard({
  children,
  style,
  padded = true,
  testID,
  variant = 'default',
}: GlassCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      testID={testID}
      style={[styles.card, variant === 'calm' && styles.calm, padded && styles.padded, style]}>
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
    calm: {
      backgroundColor: colors.accentLight,
      borderColor: colors.accentMid,
    },
    padded: {
      padding: space[4],
    },
  });
}
