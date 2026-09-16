import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { density, radii } from '@/src/constants/layout';
import { fontSizes, lineHeights } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

export type SelectChipProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  /** Optional leading content (icon / digit). */
  leading?: ReactNode;
};

/**
 * STATE chip — filters, severity 0–3, allergen/layer selection.
 * Uses `radii.sm` (not ACTION `full`).
 */
export function SelectChip({
  label,
  selected = false,
  disabled = false,
  onPress,
  testID,
  accessibilityLabel,
  leading,
}: SelectChipProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      testID={testID}
      style={[styles.chip, selected && styles.chipSelected, disabled && styles.chipDisabled]}
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={4}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    chip: {
      minHeight: density.tapMinHeight,
      paddingHorizontal: 12,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    chipSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    chipDisabled: { opacity: 0.45 },
    leading: { alignItems: 'center', justifyContent: 'center' },
    label: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      fontWeight: '600',
      color: colors.text,
    },
    labelSelected: { color: colors.head },
  });
}
