import { PropsWithChildren, useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

type GlassCardProps = PropsWithChildren<{
  style?: ViewStyle;
  padded?: boolean;
}>;

export function GlassCard({ children, style, padded = true }: GlassCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
}

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      ...(shadows.glass as object),
    },
    padded: {
      padding: 18,
    },
  });
}
