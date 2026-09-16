import { type ReactNode, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { density, radii, space } from '@/src/constants/layout';
import { fontSizes, lineHeights, scaledTextProps } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

export type BrandFieldTone = 'recognition' | 'composition';

type BrandFieldProps = {
  tone?: BrandFieldTone;
  eyebrow?: string;
  title?: string;
  meta?: string;
  children?: ReactNode;
  testID?: string;
};

/**
 * Institutional 50% / 35% field from the brandbook.
 * recognition = green + petrol ink; composition = petrol + card ink.
 */
export function BrandField({
  tone = 'recognition',
  eyebrow,
  title,
  meta,
  children,
  testID,
}: BrandFieldProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, tone), [theme, tone]);

  return (
    <View style={styles.field} testID={testID ?? `brand-field-${tone}`}>
      {eyebrow ? (
        <Text {...scaledTextProps} style={styles.eyebrow}>
          {eyebrow}
        </Text>
      ) : null}
      {title ? (
        <Text {...scaledTextProps} style={styles.fieldTitle}>
          {title}
        </Text>
      ) : null}
      {meta ? (
        <Text {...scaledTextProps} style={styles.meta}>
          {meta}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme, tone: BrandFieldTone) {
  const isRecognition = tone === 'recognition';
  const ink = isRecognition ? colors.onAccent : colors.card;
  return StyleSheet.create({
    field: {
      backgroundColor: isRecognition ? colors.accent : colors.info,
      borderRadius: radii.field,
      padding: density.cardPadding,
      gap: space[2],
    },
    eyebrow: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.caption,
      lineHeight: lineHeights.caption,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: ink,
      opacity: 0.85,
    },
    fieldTitle: {
      fontFamily: fonts.serifBold,
      fontSize: fontSizes.h3,
      lineHeight: lineHeights.h3,
      color: ink,
    },
    meta: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
      color: ink,
      opacity: 0.9,
    },
  });
}
