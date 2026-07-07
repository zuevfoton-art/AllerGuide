import { useMemo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { BrandMark } from '@/src/components/brand/BrandMark';

type BrandLogoProps = {
  size?: number;
  showWordmark?: boolean;
  /** Co-brand lockup: "an Aclearo app" under the wordmark */
  showEndorser?: boolean;
  style?: ViewStyle;
};

export function BrandLogo({
  size = 64,
  showWordmark = false,
  showEndorser = false,
  style,
}: BrandLogoProps) {
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
    <View style={[styles.column, style]}>
      <View style={styles.row}>
        <BrandMark size={size} accent={theme.colors.accent} color={theme.colors.onAccent} />
        <View style={styles.wordmark}>
          <Text style={styles.wordA}>A</Text>
          <Text style={styles.wordClaro}>‑Claro</Text>
        </View>
      </View>
      {showEndorser ? <Text style={styles.endorser}>an Aclearo app</Text> : null}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme, size: number) {
  const fontSize = Math.round(size * 0.42);
  const endorserSize = Math.round(size * 0.2);
  return StyleSheet.create({
    markWrap: { alignSelf: 'center' },
    column: { alignItems: 'center', gap: Math.round(size * 0.12) },
    row: { flexDirection: 'row', alignItems: 'center', gap: Math.round(size * 0.18) },
    wordmark: { flexDirection: 'row', alignItems: 'baseline' },
    wordA: {
      fontFamily: fonts.sansSemiBold,
      fontSize,
      fontWeight: '700',
      color: colors.accent,
      letterSpacing: -0.5,
    },
    wordClaro: {
      fontFamily: fonts.sansSemiBold,
      fontSize,
      fontWeight: '600',
      color: colors.head,
      letterSpacing: -0.3,
    },
    endorser: {
      fontFamily: fonts.sans,
      fontSize: endorserSize,
      fontWeight: '400',
      color: colors.textMuted,
      letterSpacing: 0.2,
    },
  });
}
