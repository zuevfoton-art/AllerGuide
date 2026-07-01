import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
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
  const { colors, shadows } = theme;
  const styles = createStyles(theme);

  return (
    <View style={[styles.footer, style]}>
      {isLast ? (
        <>
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
          <Pressable
            testID="onboarding-intro-next"
            accessibilityRole="button"
            accessibilityLabel={startLabel}
            onPress={onNext}
            style={({ pressed }) => [styles.startPillFull, pressed && styles.pressed, shadows.accent]}>
            <Text style={styles.startPillText}>{startLabel}</Text>
          </Pressable>
        </>
      ) : (
        <View style={styles.footerRow}>
          <View style={styles.dots} accessibilityRole="tablist">
            {Array.from({ length: slideCount }, (_, i) => (
              <View
                key={i}
                accessibilityRole="tab"
                accessibilityState={{ selected: i === index }}
                style={[styles.dot, i === index && styles.dotActive]}
              />
            ))}
          </View>
          <Pressable
            testID="onboarding-intro-next"
            accessibilityRole="button"
            accessibilityLabel={nextLabel}
            onPress={onNext}
            style={({ pressed }) => [styles.nextCircle, pressed && styles.pressed, shadows.accent]}>
            <Ionicons name="arrow-forward" size={22} color={colors.onAccent} />
          </Pressable>
        </View>
      )}

      {!isLast ? (
        <Pressable testID="onboarding-intro-skip" onPress={onSkip} hitSlop={12}>
          <Text style={styles.skip}>{skipLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    footer: {
      gap: 14,
      paddingTop: 8,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    dots: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    dotsCentered: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 4,
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
    nextCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    startPillFull: {
      width: '100%',
      paddingVertical: 16,
      borderRadius: 28,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    startPillText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      fontWeight: '600',
      color: colors.onAccent,
    },
    pressed: {
      opacity: 0.92,
      transform: [{ scale: 0.98 }],
    },
    skip: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
}
