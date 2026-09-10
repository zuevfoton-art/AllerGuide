import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  evaluatePasswordStrength,
  type PasswordCharacterClass,
  type PasswordStrengthLevel,
} from '@allerguide/core';
import { radii, space } from '@/src/constants/layout';
import { fontSizes, scaledTextProps } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

const STRENGTH_SEGMENT_COUNT = 4;
const STRENGTH_BAR_HEIGHT = 6;
const STRENGTH_ICON_SIZE = 14;

const FILLED_SEGMENTS: Record<PasswordStrengthLevel, number> = {
  weak: 1,
  fair: 2,
  good: 3,
  strong: 4,
};

const CHARACTER_CLASSES: PasswordCharacterClass[] = [
  'lowercase',
  'uppercase',
  'digit',
  'symbol',
];

export function PasswordStrengthMeter({
  password,
  login,
}: {
  password: string;
  login?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const strength = useMemo(
    () => evaluatePasswordStrength(password, { login }),
    [password, login],
  );

  if (!password) return null;

  const levelColor = levelToColor(theme, strength.level);
  const filledCount = FILLED_SEGMENTS[strength.level];
  const levelLabel = t(`auth.passwordStrength.${strength.level}`);
  const accessibilityLabel = `${t('auth.passwordStrength.label')}: ${levelLabel}`;

  return (
    <View
      style={styles.wrap}
      testID="password-strength-meter"
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        min: 0,
        max: STRENGTH_SEGMENT_COUNT,
        now: filledCount,
        text: levelLabel,
      }}
      accessibilityLiveRegion="polite">
      <View style={styles.header}>
        <Text {...scaledTextProps} style={styles.label}>
          {t('auth.passwordStrength.label')}
        </Text>
        <Text
          {...scaledTextProps}
          testID="password-strength-level"
          style={[styles.level, { color: levelColor }]}>
          {levelLabel}
        </Text>
      </View>
      <View style={styles.bar} accessibilityElementsHidden>
        {Array.from({ length: STRENGTH_SEGMENT_COUNT }, (_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              {
                backgroundColor:
                  index < filledCount ? levelColor : theme.colors.border,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.rules}>
        <RuleChip
          label={t('auth.passwordStrength.minLength')}
          satisfied={!strength.failedRules.includes('minLength')}
          styles={styles}
          theme={theme}
        />
        {CHARACTER_CLASSES.map((characterClass) => (
          <RuleChip
            key={characterClass}
            label={t(`auth.passwordStrength.${characterClass}`)}
            satisfied={strength.satisfiedClasses.includes(characterClass)}
            styles={styles}
            theme={theme}
          />
        ))}
      </View>
      <Text {...scaledTextProps} style={styles.hint}>
        {t('auth.passwordStrength.classesHint')}
      </Text>
      {strength.failedRules.includes('notCommon') ? (
        <Text {...scaledTextProps} style={styles.warning}>
          {t('auth.passwordStrength.common')}
        </Text>
      ) : null}
      {strength.failedRules.includes('notLikeLogin') ? (
        <Text {...scaledTextProps} style={styles.warning}>
          {t('auth.passwordStrength.likeLogin')}
        </Text>
      ) : null}
    </View>
  );
}

function RuleChip({
  label,
  satisfied,
  styles,
  theme,
}: {
  label: string;
  satisfied: boolean;
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
}) {
  return (
    <View style={[styles.chip, satisfied && styles.chipSatisfied]}>
      <Ionicons
        name={satisfied ? 'checkmark-circle' : 'ellipse-outline'}
        size={STRENGTH_ICON_SIZE}
        color={satisfied ? theme.colors.success : theme.colors.textMuted}
      />
      <Text
        {...scaledTextProps}
        style={[styles.chipText, satisfied && styles.chipTextSatisfied]}>
        {label}
      </Text>
    </View>
  );
}

function levelToColor(theme: AppTheme, level: PasswordStrengthLevel): string {
  if (level === 'weak') return theme.colors.danger;
  if (level === 'fair') return theme.colors.warning;
  if (level === 'good') return theme.colors.accent;
  return theme.colors.success;
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      gap: space[2],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    label: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.caption,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    level: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.label,
      fontWeight: '600',
    },
    bar: {
      flexDirection: 'row',
      gap: space[1],
    },
    segment: {
      flex: 1,
      height: STRENGTH_BAR_HEIGHT,
      borderRadius: radii.xs,
    },
    rules: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space[1],
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[1],
      paddingHorizontal: space[2],
      paddingVertical: space[1],
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    chipSatisfied: {
      borderColor: colors.successBorder,
      backgroundColor: colors.successLight,
    },
    chipText: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.caption,
      color: colors.textMuted,
    },
    chipTextSatisfied: {
      color: colors.success,
      fontFamily: fonts.sansMedium,
    },
    hint: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.caption,
      color: colors.textSecondary,
    },
    warning: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm,
      color: colors.warningText,
    },
  });
}
