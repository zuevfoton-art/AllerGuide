import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  linkLabel?: string;
  onLinkPress?: () => void;
  right?: React.ReactNode;
  style?: ViewStyle;
};

export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  linkLabel,
  onLinkPress,
  right,
  style,
}: ScreenHeaderProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.textWrap}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
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

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    textWrap: { flex: 1, gap: 4 },
    eyebrow: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    title: {
      fontFamily: fonts.serifBold,
      fontSize: 26,
      fontWeight: '700',
      color: colors.head,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    link: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
      marginTop: 8,
    },
  });
}
