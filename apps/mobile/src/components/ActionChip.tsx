import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { density, radii } from '@/src/constants/layout';
import { fontSizes, lineHeights } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

export type ActionChipProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  testID?: string;
  accessibilityLabel?: string;
};

/**
 * ACTION chip — quick commands («Спросить», ready-made Ask questions).
 * Uses `radii.full` like Button.
 */
export function ActionChip({
  label,
  onPress,
  disabled = false,
  selected = false,
  testID,
  accessibilityLabel,
}: ActionChipProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      testID={testID}
      style={[styles.chip, selected && styles.chipSelected, disabled && styles.chipDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={4}>
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles({ colors, fonts, shadows }: AppTheme) {
  return StyleSheet.create({
    chip: {
      minHeight: density.tapMinHeight,
      paddingHorizontal: 14,
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: colors.accentMid,
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
      ...(shadows.sm as object),
    },
    chipSelected: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
      ...(shadows.accent as object),
    },
    chipDisabled: { opacity: 0.45 },
    label: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      fontWeight: '600',
      color: colors.head,
    },
    labelSelected: { color: colors.onAccent },
  });
}
