import { StyleSheet, View, type ViewStyle } from 'react-native';
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

/** Zip onboarding: full-width Далее/Начать + text skip. */
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
      <View style={styles.actions}>
        <Button
          testID="onboarding-intro-next"
          label={isLast ? startLabel : nextLabel}
          variant="primary"
          block
          onPress={onNext}
          style={styles.nextBtn}
        />
        {!isLast ? (
          <Button
            testID="onboarding-intro-skip"
            label={skipLabel}
            variant="ghost"
            onPress={onSkip}
          />
        ) : null}
      </View>
    </View>
  );
}

function createStyles({ colors }: AppTheme) {
  return StyleSheet.create({
    footer: {
      gap: space[4],
      paddingTop: space[8],
      alignItems: 'center',
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
      borderRadius: 4,
      backgroundColor: colors.surfaceDark,
    },
    dotActive: {
      width: 24,
      backgroundColor: colors.accent,
    },
    actions: {
      width: '100%',
      gap: space[4],
      alignItems: 'center',
    },
    nextBtn: {
      borderRadius: radii.lg,
      minHeight: density.tapMinHeightPrimary,
    },
  });
}
