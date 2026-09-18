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

/** Figma onboarding controls: dots + equal Skip | Next (171×52, radius xl). */
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
          <View style={styles.actionSlot}>
            <Button
              testID="onboarding-intro-skip"
              label={skipLabel}
              variant="secondary"
              block
              onPress={onSkip}
              style={styles.figmaAction}
            />
          </View>
        ) : (
          <View style={styles.actionSlot} />
        )}
        <View style={styles.actionSlot}>
          <Button
            testID="onboarding-intro-next"
            label={isLast ? startLabel : nextLabel}
            variant="primary"
            block
            onPress={onNext}
            style={styles.figmaAction}
          />
        </View>
      </View>
    </View>
  );
}

function createStyles({ colors }: AppTheme) {
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
    actionSlot: {
      flex: 1,
      minWidth: 0,
    },
    /** Figma button-skip / button-next: height 52, radius 24 */
    figmaAction: {
      borderRadius: radii.xl,
      minHeight: density.tapMinHeightPrimary,
    },
  });
}
