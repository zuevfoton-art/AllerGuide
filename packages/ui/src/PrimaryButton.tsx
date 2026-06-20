import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  backgroundColor?: string;
  textColor?: string;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  style,
  backgroundColor = '#1F7A5A',
  textColor = '#FFFFFF',
}: PrimaryButtonProps) {
  return (
    <Pressable
      style={[styles.button, { backgroundColor }, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <Text style={[styles.text, { color: textColor }]}>{loading ? '...' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  disabled: { opacity: 0.65 },
  text: { fontSize: 16, fontWeight: '700' },
});
