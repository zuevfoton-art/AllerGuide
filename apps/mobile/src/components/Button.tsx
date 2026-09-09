import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, type PressableProps, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { density, radii } from '@/src/constants/layout';
import { disabledOpacity, pressedOpacity } from '@/src/constants/motion';
import { fontSizes, scaledTextProps } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTextScaleMultiplier } from '@/src/store/appearance-store';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'md' | 'sm';

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
  ghost: 'accent',
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
          { color: textColor },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles({ colors, fonts }: AppTheme, scale: number) {
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: radii.full,
      minHeight: density.tapMinHeight,
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
    block: { width: '100%' },
    primary: { backgroundColor: colors.accent },
    secondary: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    ghost: { backgroundColor: 'transparent', minHeight: 36, paddingHorizontal: 0 },
    danger: { backgroundColor: colors.danger },
    disabled: { opacity: disabledOpacity },
    pressed: { opacity: pressedOpacity },
    text: {
      fontFamily: fonts.sansSemiBold,
      fontSize: Math.round(fontSizes.body * scale),
      fontWeight: '600',
      flexShrink: 1,
    },
    textSm: { fontSize: Math.round(fontSizes.label * scale) },
  });
}
