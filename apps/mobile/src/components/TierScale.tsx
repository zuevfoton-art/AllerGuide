import { StyleSheet, View, type ViewStyle } from 'react-native';
import { radii } from '@/src/constants/layout';
import { useTheme } from '@/src/hooks/use-theme';
import { useZoneColors, type Zone } from '@/src/hooks/use-zone-colors';

type TierScaleProps = {
  segments?: number;
  activeIndex: number;
  zone?: Zone | null;
  /** Per-segment colors (UPI pollen scale). Falls back to the zone fill. */
  segmentColors?: string[];
  style?: ViewStyle;
};

/** Compact 4–6 segment companion next to a verbal wellness label. */
export function TierScale({
  segments = 4,
  activeIndex,
  zone,
  segmentColors,
  style,
}: TierScaleProps) {
  const theme = useTheme();
  const zoneColors = useZoneColors(zone);
  const fill = zoneColors?.fg ?? theme.colors.accent;
  const count = segmentColors?.length ?? segments;

  return (
    <View style={[styles.scale, style]} accessibilityElementsHidden>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            {
              backgroundColor: segmentColors?.[index] ?? fill,
              opacity: index === activeIndex ? 1 : segmentColors ? 0.35 : 0.28,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scale: {
    flexDirection: 'row',
    gap: 3,
    height: 8,
    width: 56,
  },
  segment: {
    flex: 1,
    borderRadius: radii.xs,
  },
});
