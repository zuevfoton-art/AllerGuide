import { Text, View } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';

export function MapLegendDot({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text
        style={{
          fontFamily: theme.fonts.sans,
          fontSize: 11,
          color: theme.colors.textMuted,
        }}>
        {label}
      </Text>
    </View>
  );
}
