import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  View,
  type DimensionValue,
  type ViewStyle,
} from 'react-native';
import { radii } from '@/src/constants/layout';
import { useTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { GlassCard } from '@/src/components/GlassCard';

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

function useSheenOpacity(reduceMotion: boolean) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.2, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return opacity;
}

function SkeletonFill({
  width = '100%',
  height = 16,
  radius = radii.sm,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  const sheenOpacity = useSheenOpacity(reduceMotion);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.fill,
        { width, height, borderRadius: radius, backgroundColor: colors.skeletonBase },
        style,
      ]}
    >
      {reduceMotion ? null : (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: colors.skeletonSheen, opacity: sheenOpacity, borderRadius: radius },
          ]}
        />
      )}
    </View>
  );
}

/** Animated placeholder block shown while content loads. */
export function Skeleton(props: SkeletonProps) {
  return <SkeletonFill {...props} />;
}

export function SkeletonLine({
  width = '100%',
  height = 13,
  radius = 6,
  style,
}: SkeletonProps) {
  return <SkeletonFill width={width} height={height} radius={radius} style={style} />;
}

type SkeletonCardProps = {
  lines?: number;
  hero?: boolean;
  variant?: 'default' | 'soft';
};

export function SkeletonCard({ lines = 3, hero = false, variant = 'default' }: SkeletonCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View accessibilityRole="progressbar" accessibilityLabel={t('common.loading')}>
    <GlassCard
      variant={variant}
    >
      <SkeletonLine width="42%" height={12} />
      {hero ? (
        <View style={styles.heroRow}>
          <SkeletonLine width={72} height={14} />
          <SkeletonFill width={104} height={36} radius={6} />
        </View>
      ) : null}
      {Array.from({ length: lines }, (_, index) => (
        <View
          key={index}
          style={[styles.lineRow, { borderTopColor: colors.border }]}
        >
          <SkeletonLine width={`${70 - index * 8}%`} />
        </View>
      ))}
    </GlassCard>
    </View>
  );
}

type SkeletonBlockProps = {
  height?: number;
  radius?: number;
};

export function SkeletonBlock({ height = 220, radius = 10 }: SkeletonBlockProps) {
  const { t } = useTranslation();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={t('common.loading')}
    >
      <SkeletonFill width="100%" height={height} radius={radius} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { overflow: 'hidden' },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingBottom: 12,
  },
  lineRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 10,
  },
});
