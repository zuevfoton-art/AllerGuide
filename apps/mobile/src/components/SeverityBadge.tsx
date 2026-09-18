import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radii, space } from '@/src/constants/layout';
import { fontSizes, lineHeights, scaledTextProps } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

export type SeverityLevel = 'safe' | 'mild' | 'moderate' | 'severe';

type SeverityBadgeProps = {
  severity: SeverityLevel;
  label: string;
};

export function SeverityBadge({ severity, label }: SeverityBadgeProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const palette = {
    safe: { bg: theme.colors.severitySafeBg, text: theme.colors.severitySafe },
    mild: { bg: theme.colors.severityMildBg, text: theme.colors.severityMild },
    moderate: { bg: theme.colors.severityModerateBg, text: theme.colors.severityModerate },
    severe: { bg: theme.colors.severitySevereBg, text: theme.colors.severitySevere },
  }[severity];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text {...scaledTextProps} style={[styles.text, { color: palette.text }]}>
        {label}
      </Text>
    </View>
  );
}

function createStyles({ fonts }: AppTheme) {
  return StyleSheet.create({
    badge: {
      paddingHorizontal: space[2],
      paddingVertical: space[1],
      borderRadius: radii.sm,
    },
    text: {
      fontFamily: fonts.sansBold,
      fontSize: fontSizes.caption,
      lineHeight: lineHeights.caption,
      fontWeight: '700',
    },
  });
}
