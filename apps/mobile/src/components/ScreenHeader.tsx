import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radii } from '@/src/constants/layout';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onBack?: () => void;
  backAccessibilityLabel?: string;
  linkLabel?: string;
  onLinkPress?: () => void;
  right?: ReactNode;
  titleTestID?: string;
  style?: ViewStyle;
};

export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
  backAccessibilityLabel,
  linkLabel,
  onLinkPress,
  right,
  titleTestID,
  style,
}: ScreenHeaderProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View style={[styles.wrap, style]}>
      {onBack ? (
        <Pressable
          testID="screen-header-back"
          style={styles.backBtn}
          onPress={onBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={backAccessibilityLabel ?? t('common.back')}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.textWrap} accessibilityRole="header">
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text testID={titleTestID} style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {linkLabel && onLinkPress ? (
        <Pressable onPress={onLinkPress} hitSlop={8}>
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
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: radii.sm,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
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
