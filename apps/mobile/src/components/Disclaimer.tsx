import { useMemo } from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

type DisclaimerProps = {
  children: string;
  style?: TextStyle;
};

export function Disclaimer({ children, style }: DisclaimerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <Text style={[styles.text, style]}>{children}</Text>;
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    text: {
      fontFamily: fonts.sans,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
}
