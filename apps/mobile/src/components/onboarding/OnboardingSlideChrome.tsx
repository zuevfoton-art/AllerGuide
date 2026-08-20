import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Button } from '@/src/components/Button';
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
      <Button
        testID="onboarding-intro-next"
        label={isLast ? startLabel : nextLabel}
        variant="primary"
        block
        onPress={onNext}
      />
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    footer: {
      gap: 14,
      paddingTop: 8,
    },
    skipBtn: {
      alignSelf: 'flex-end',
      minHeight: 36,
      justifyContent: 'center',
    },
    dotsCentered: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accentMid,
      opacity: 0.45,
    },
    dotActive: {
      width: 22,
      backgroundColor: colors.accent,
      opacity: 1,
    },
    skip: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
    },
  });
}
