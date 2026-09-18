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
  /** Figma auth tabs are 36pt with sm corners. */
  size?: 'md' | 'sm';
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
  size = 'md',
}: SegmentedControlProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const compact = size === 'sm';

  return (
    <View
      style={[styles.track, compact && styles.trackSm]}
      testID={testID}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={option.testID}
            style={[
              styles.segment,
              compact && styles.segmentSm,
              selected && styles.segmentSelected,
            ]}
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

function createStyles({ colors, fonts, shadows }: AppTheme) {
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
    trackSm: {
      borderRadius: radii.sm,
      padding: 2,
    },
    segment: {
      flex: 1,
      minHeight: density.tapMinHeight,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    segmentSm: {
      minHeight: density.tapMinHeightSm,
      borderRadius: radii.sm,
    },
    segmentSelected: {
      backgroundColor: colors.accentLight,
      borderWidth: 1,
      borderColor: colors.accentMid,
      ...(shadows.raised as object),
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
