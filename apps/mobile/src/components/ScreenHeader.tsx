import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  linkLabel?: string;
  onLinkPress?: () => void;
  right?: React.ReactNode;
  style?: ViewStyle;
};

export function ScreenHeader({ title, subtitle, linkLabel, onLinkPress, right, style }: ScreenHeaderProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {linkLabel && onLinkPress ? (
        <Pressable onPress={onLinkPress}>
          <Text style={styles.link}>{linkLabel}</Text>
        </Pressable>
      ) : null}
      {right}
    </View>
  );
}

function createStyles({ colors }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    textWrap: { flex: 1, gap: 4 },
    title: { fontSize: 32, fontWeight: '800', color: colors.text, letterSpacing: -0.8 },
    subtitle: { fontSize: 15, color: colors.textSecondary, fontWeight: '500', lineHeight: 20 },
    link: { fontSize: 14, fontWeight: '700', color: colors.teal, marginTop: 8 },
  });
}
