import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, type TextStyle, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatDisclaimerFootnote } from '@allerguide/core';
import { fontSizes, lineHeights, scaledTextProps } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

type DisclaimerProps = {
  children: string;
  style?: TextStyle;
  /** Show MDR v2 footnote (E.5). Ignored when `compact` is true. */
  showMdrFootnote?: boolean;
  compact?: boolean;
  /** First sentence + «Подробнее»; long medical copy stays off the first screen. */
  collapsible?: boolean;
  onDetails?: () => void;
};

function firstSentence(text: string): string {
  const match = text.trim().match(/^.+?[.!?](?:\s|$)/);
  return match ? match[0].trim() : text.trim();
}

export function Disclaimer({
  children,
  style,
  showMdrFootnote = false,
  compact = false,
  collapsible = false,
  onDetails,
}: DisclaimerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const openDetails = () => {
    if (onDetails) {
      onDetails();
      return;
    }
    router.push('/about');
  };

  if (compact) {
    return (
      <View style={styles.compactWrap}>
        <Ionicons name="information-circle-outline" size={14} color={theme.colors.textMuted} />
        <Text {...scaledTextProps} style={[styles.compactText, style]}>
          {children}
        </Text>
        <Pressable onPress={openDetails} hitSlop={8} accessibilityRole="link">
          <Text {...scaledTextProps} style={styles.details}>
            {t('disclaimer.details')}
          </Text>
        </Pressable>
      </View>
    );
  }

  const preview = firstSentence(children);
  const canCollapse = collapsible && preview.length < children.trim().length;
  const body = canCollapse && !expanded ? preview : children;

  return (
    <View style={styles.wrap}>
      <Text {...scaledTextProps} style={[styles.text, style]}>
        {body}
      </Text>
      {canCollapse ? (
        <Pressable
          onPress={() => setExpanded((open) => !open)}
          hitSlop={8}
          accessibilityRole="button">
          <Text {...scaledTextProps} style={styles.details}>
            {expanded ? t('common.hideDetails') : t('common.moreDetails')}
          </Text>
        </Pressable>
      ) : null}
      {showMdrFootnote ? (
        <Text {...scaledTextProps} style={styles.footnote}>
          {formatDisclaimerFootnote()}
        </Text>
      ) : null}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      gap: 4,
    },
    compactWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    text: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.caption,
      lineHeight: lineHeights.caption,
      color: colors.textMuted,
      textAlign: 'center',
    },
    compactText: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.caption,
      lineHeight: lineHeights.caption,
      color: colors.textMuted,
    },
    details: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.caption,
      lineHeight: lineHeights.caption,
      color: colors.accent,
    },
    footnote: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.caption,
      lineHeight: lineHeights.caption,
      color: colors.textMuted,
      textAlign: 'center',
      opacity: 0.85,
    },
  });
}
