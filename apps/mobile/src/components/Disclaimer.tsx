import { useMemo } from 'react';
import { StyleSheet, Text, type TextStyle, View } from 'react-native';
import { formatDisclaimerFootnote } from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

type DisclaimerProps = {
  children: string;
  style?: TextStyle;
  /** Show MDR v2 footnote (E.5). */
  showMdrFootnote?: boolean;
};

export function Disclaimer({ children, style, showMdrFootnote = false }: DisclaimerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.wrap}>
      <Text style={[styles.text, style]}>{children}</Text>
      {showMdrFootnote ? (
        <Text style={styles.footnote}>{formatDisclaimerFootnote()}</Text>
      ) : null}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      gap: 4,
    },
    text: {
      fontFamily: fonts.sans,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textMuted,
      textAlign: 'center',
    },
    footnote: {
      fontFamily: fonts.sans,
      fontSize: 9,
      lineHeight: 12,
      color: colors.textMuted,
      textAlign: 'center',
      opacity: 0.85,
    },
  });
}
