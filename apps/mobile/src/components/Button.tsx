import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, type PressableProps, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { density, radii } from '@/src/constants/layout';
import { disabledOpacity, pressedOpacity } from '@/src/constants/motion';
import { fontSizes, scaledTextProps } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTextScaleMultiplier } from '@/src/store/appearance-store';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
/** `lg` is reserved for crisis actions (≥60 pt). */
type ButtonSize = 'lg' | 'md' | 'sm';

type ButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
};

const TEXT_COLORS: Record<ButtonVariant, keyof AppTheme['colors']> = {
  primary: 'onAccent',
  secondary: 'text',
  // Ghost is a text link — petrol ink, not mint recognition fill.
  ghost: 'head',
  danger: 'onDanger',
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  block = false,
  icon,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const textScale = useTextScaleMultiplier();
  const styles = useMemo(() => createStyles(theme, textScale), [theme, textScale]);
  const textColor = theme.colors[TEXT_COLORS[variant]];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        size === 'sm' && styles.sm,
        size === 'lg' && styles.lg,
        block && styles.block,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style as ViewStyle,
      ]}
      {...rest}>
      {icon ? <Ionicons name={icon} size={15} color={textColor} /> : null}
      <Text
        {...scaledTextProps}
        numberOfLines={1}
        style={[
          styles.text,
          size === 'sm' && styles.textSm,
          size === 'lg' && styles.textLg,
          { color: textColor },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles({ colors, fonts, shadows }: AppTheme, scale: number) {
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: radii.full,
      minHeight: density.tapMinHeightPrimary,
      minWidth: 0,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    sm: {
      minHeight: density.tapMinHeightSm,
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: radii.full,
    },
    lg: {
      minHeight: density.tapMinHeightCrisis,
      paddingHorizontal: 24,
      paddingVertical: 14,
    },
    block: { width: '100%' },
    primary: {
      backgroundColor: colors.accent,
      ...(shadows.raisedStrong as object),
    },
    secondary: {
      // Fill (not outline) so secondary stays visible on white cards without a contour ring.
      backgroundColor: colors.surfaceMuted,
      minHeight: density.tapMinHeightSecondary,
      ...(shadows.raised as object),
    },
    ghost: { backgroundColor: 'transparent', minHeight: 36, paddingHorizontal: 0 },
    danger: {
      backgroundColor: colors.danger,
      ...(shadows.raisedStrong as object),
    },
    disabled: { opacity: disabledOpacity },
    pressed: {
      opacity: pressedOpacity,
      transform: [{ translateY: 1 }],
      ...(shadows.sm as object),
    },
    text: {
      fontFamily: fonts.sansSemiBold,
      fontSize: Math.round(fontSizes.body * scale),
      fontWeight: '600',
      flexShrink: 1,
    },
    textSm: { fontSize: Math.round(fontSizes.label * scale) },
    textLg: { fontSize: Math.round(fontSizes.h4 * scale) },
  });
}
