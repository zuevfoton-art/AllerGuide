import { useMemo, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { density, radii, space } from '@/src/constants/layout';
import { fontSizes, lineHeights, scaledTextProps } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type WellnessKpiItem = {
  label: string;
  value: string;
  unit?: string;
  color: string;
};

type WellnessSummaryProps = {
  title: string;
  items: WellnessKpiItem[];
  testID?: string;
};

export function WellnessSummary({ title, items, testID }: WellnessSummaryProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(true);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((open) => !open);
  };

  return (
    <View style={styles.container} testID={testID}>
      <Pressable
        onPress={toggle}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        hitSlop={8}>
        <Text {...scaledTextProps} style={styles.title}>
          {title}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.colors.textSecondary}
        />
      </Pressable>
      {expanded ? (
        <View style={styles.kpiRow}>
          {items.map((item) => (
            <View key={item.label} style={styles.kpiCard}>
              <Text {...scaledTextProps} style={[styles.kpiValue, { color: item.color }]}>
                {item.value}
              </Text>
              {item.unit ? (
                <Text {...scaledTextProps} style={[styles.kpiUnit, { color: item.color }]}>
                  {item.unit}
                </Text>
              ) : null}
              <Text {...scaledTextProps} style={styles.kpiLabel}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      padding: density.cardPadding,
      gap: space[3],
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: density.tapMinHeightSm,
    },
    title: {
      fontFamily: fonts.sansBold,
      fontSize: fontSizes.h4,
      lineHeight: lineHeights.h4,
      fontWeight: '700',
      color: colors.head,
    },
    kpiRow: { flexDirection: 'row', gap: space[2] },
    kpiCard: {
      flex: 1,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.lg,
      padding: space[3],
      alignItems: 'center',
      gap: space[1],
    },
    kpiValue: {
      fontFamily: fonts.sansBold,
      fontSize: fontSizes.h2,
      lineHeight: lineHeights.h2,
      fontWeight: '700',
    },
    kpiUnit: {
      fontFamily: fonts.sansMedium,
      fontSize: fontSizes.caption,
      lineHeight: lineHeights.caption,
      fontWeight: '500',
    },
    kpiLabel: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.caption,
      lineHeight: lineHeights.caption,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
}
