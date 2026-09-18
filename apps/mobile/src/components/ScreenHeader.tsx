import { useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radii, space } from '@/src/constants/layout';
import { fontSizes, lineHeights, tracking } from '@/src/constants/typography';
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
    <View style={[styles.wrap, style]} collapsable={false}>
      <View style={styles.left}>
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
          <View testID={titleTestID} collapsable={false}>
            <Text style={styles.title}>{title}</Text>
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
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
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: space[3],
      paddingHorizontal: space[5],
      flexShrink: 0,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: radii.full,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWrap: { flex: 1, gap: 2 },
    eyebrow: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.caption,
      lineHeight: lineHeights.caption,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: tracking.label,
    },
    title: {
      fontFamily: fonts.sansBold,
      fontSize: fontSizes.h3,
      lineHeight: lineHeights.h3,
      fontWeight: '700',
      color: colors.head,
    },
    subtitle: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      color: colors.textSecondary,
      marginTop: 2,
    },
    link: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      fontWeight: '600',
      color: colors.head,
    },
  });
}
