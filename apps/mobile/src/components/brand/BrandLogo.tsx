import { useMemo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { BrandMark } from '@/src/components/brand/BrandMark';

type BrandLogoProps = {
  size?: number;
  showWordmark?: boolean;
  style?: ViewStyle;
};

export function BrandLogo({ size = 64, showWordmark = false, style }: BrandLogoProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, size), [theme, size]);

  if (!showWordmark) {
    return (
      <View style={[styles.markWrap, style]}>
        <BrandMark size={size} accent={theme.colors.accent} color={theme.colors.onAccent} />
      </View>
    );
  }

  return (
    <View style={[styles.row, style]}>
      <BrandMark size={size} accent={theme.colors.accent} color={theme.colors.onAccent} />
      <View style={styles.wordmark}>
        <Text style={styles.wordAller}>Aller</Text>
        <Text style={styles.wordGuide}>Guide</Text>
      </View>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme, size: number) {
  const fontSize = Math.round(size * 0.42);
  return StyleSheet.create({
    markWrap: { alignSelf: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', gap: Math.round(size * 0.2) },
    wordmark: { flexDirection: 'row', alignItems: 'baseline' },
    wordAller: {
      fontFamily: fonts.serifBold,
      fontSize,
      fontWeight: '700',
      color: colors.head,
      letterSpacing: -0.3,
    },
    wordGuide: {
      fontFamily: fonts.sansSemiBold,
      fontSize,
      fontWeight: '600',
      color: colors.accent,
    },
  });
}
