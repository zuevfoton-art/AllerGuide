import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

interface BadgeProps {
  label: string;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

export function Badge({ label, color = '#1F7A5A', backgroundColor = '#E8F5EF', style }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor, borderColor: `${color}33` }, style]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
