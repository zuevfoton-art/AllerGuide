import { PropsWithChildren, useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { density, radii } from '@/src/constants/layout';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useZoneColors, type Zone } from '@/src/hooks/use-zone-colors';

type GlassCardProps = PropsWithChildren<{
  style?: ViewStyle;
  padded?: boolean;
  testID?: string;
  /** Clinical information fill. Omit when the card is not a state surface. */
  zone?: Zone | null;
}>;

/** Clinical card surface. */
export function GlassCard({
  children,
  style,
  padded = true,
  testID,
  zone,
}: GlassCardProps) {
  const theme = useTheme();
  const zoneColors = useZoneColors(zone);
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        zoneColors
          ? { backgroundColor: zoneColors.bg, borderColor: zoneColors.border }
          : null,
        padded && styles.padded,
        style,
      ]}>
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
    padded: {
      padding: density.cardPadding,
    },
  });
}
