import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Button } from '@/src/components/Button';
import { density, radii, space } from '@/src/constants/layout';
import type { AppTheme } from '@/src/hooks/use-theme';

type OnboardingSlideChromeProps = {
  theme: AppTheme;
  slideCount: number;
  index: number;
  isLast: boolean;
  nextLabel: string;
  startLabel: string;
  skipLabel: string;
  onNext: () => void;
  onSkip: () => void;
  style?: ViewStyle;
};

/** Figma onboarding controls: dots + Skip | Next row. */
export function OnboardingSlideChrome({
  theme,
  slideCount,
  index,
  isLast,
  nextLabel,
  startLabel,
  skipLabel,
  onNext,
  onSkip,
  style,
}: OnboardingSlideChromeProps) {
  const styles = createStyles(theme);

  return (
    <View style={[styles.footer, style]}>
      <View style={styles.dotsCentered} accessibilityRole="tablist">
        {Array.from({ length: slideCount }, (_, i) => (
          <View
            key={i}
            accessibilityRole="tab"
            accessibilityState={{ selected: i === index }}
            style={[styles.dot, i === index && styles.dotActive]}
          />
        ))}
      </View>
      <View style={styles.actionsRow}>
        {!isLast ? (
          <Pressable
            testID="onboarding-intro-skip"
            onPress={onSkip}
            hitSlop={12}
            style={styles.skipBtn}
            accessibilityRole="button"
            accessibilityLabel={skipLabel}>
            <Text style={styles.skip}>{skipLabel}</Text>
          </Pressable>
        ) : (
          <View style={styles.skipBtn} />
        )}
        <View style={styles.nextWrap}>
          <Button
            testID="onboarding-intro-next"
            label={isLast ? startLabel : nextLabel}
            variant="primary"
            block
            onPress={onNext}
          />
        </View>
      </View>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    footer: {
      gap: space[3],
      paddingTop: space[2],
    },
    dotsCentered: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space[2],
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: radii.xs,
      backgroundColor: colors.accentMid,
      opacity: 0.45,
    },
    dotActive: {
      width: 24,
      backgroundColor: colors.accent,
      opacity: 1,
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
    },
    skipBtn: {
      minWidth: 88,
      minHeight: density.tapMinHeightSecondary,
      justifyContent: 'center',
      paddingHorizontal: space[2],
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    skip: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.head,
      textAlign: 'center',
    },
    nextWrap: { flex: 1 },
  });
}
