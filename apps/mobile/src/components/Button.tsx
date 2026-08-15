import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, type PressableProps, type ViewStyle } from 'react-native';
import { radii } from '@/src/constants/layout';
import { fontSizes, scaledTextProps } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'md' | 'sm';

type ButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
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
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
      <Text
        {...scaledTextProps}
        style={[
          styles.text,
          size === 'sm' && styles.textSm,
          { color: theme.colors[TEXT_COLORS[variant]] },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      minHeight: 44,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    sm: {
      minHeight: 36,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: radii.sm,
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
    disabled: { opacity: 0.55 },
    pressed: { opacity: 0.88 },
    text: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.body,
      fontWeight: '600',
    },
    textSm: { fontSize: fontSizes.label },
  });
}
