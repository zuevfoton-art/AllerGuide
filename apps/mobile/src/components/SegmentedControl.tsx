import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { density, radii } from '@/src/constants/layout';
import { fontSizes, lineHeights } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

export type SegmentedControlOption = {
  value: string;
  label: string;
  testID?: string;
};

export type SegmentedControlProps = {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
};

/**
 * Mutually exclusive settings. Outer track uses ACTION radius; segments stay STATE.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  disabled = false,
  accessibilityLabel,
  testID,
}: SegmentedControlProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      style={styles.track}
      testID={testID}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={option.testID}
            style={[styles.segment, selected && styles.segmentSelected]}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={option.label}
            hitSlop={4}>
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    track: {
      flexDirection: 'row',
      gap: 4,
      padding: 4,
      borderRadius: radii.full,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    segment: {
      flex: 1,
      minHeight: density.tapMinHeight,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    segmentSelected: {
      backgroundColor: colors.accentLight,
      borderWidth: 1,
      borderColor: colors.accentMid,
    },
    label: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      fontWeight: '600',
      color: colors.textMuted,
    },
    labelSelected: { color: colors.head },
  });
}
