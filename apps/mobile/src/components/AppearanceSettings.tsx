import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useMemo } from 'react';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { radii } from '@/src/constants/layout';
import { fontSizes, lineHeights, type TextScalePreset } from '@/src/constants/typography';
import { useAppearanceStore } from '@/src/store/appearance-store';
import { useTranslation } from '@/src/store/locale-store';
import { ThemeToggle } from '@/src/components/ThemeToggle';

const SCALE_ORDER: TextScalePreset[] = ['regular', 'large', 'max'];

/** Theme, text size, and calm-motion controls for the profile hub. */
export function AppearanceSettings() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const textScale = useAppearanceStore((s) => s.textScale);
  const setTextScale = useAppearanceStore((s) => s.setTextScale);
  const preferCalmMotion = useAppearanceStore((s) => s.preferCalmMotion);
  const setPreferCalmMotion = useAppearanceStore((s) => s.setPreferCalmMotion);
  const showWeekRing = useAppearanceStore((s) => s.showWeekRing);
  const setShowWeekRing = useAppearanceStore((s) => s.setShowWeekRing);

  return (
    <View style={styles.wrap}>
      <Text style={ui.sectionLabel}>{t('appearance.title')}</Text>
      <ThemeToggle embedded />
      <Text style={styles.group}>{t('appearance.textSize')}</Text>
      <View style={styles.row}>
        {SCALE_ORDER.map((preset, index) => {
          const active = textScale === preset;
          const labelKey =
            preset === 'regular'
              ? 'appearance.textRegular'
              : preset === 'large'
                ? 'appearance.textLarge'
                : 'appearance.textMax';
          return (
            <Pressable
              key={preset}
              style={[
                styles.seg,
                index < SCALE_ORDER.length - 1 && styles.segBorder,
                active && styles.segActive,
              ]}
              onPress={() => setTextScale(preset)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(labelKey)}>
              <Text style={[styles.segText, active && styles.segTextActive]}>{t(labelKey)}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <Text style={styles.switchTitle}>{t('appearance.calmMotion')}</Text>
          <Text style={styles.switchHint}>{t('appearance.calmMotionHint')}</Text>
        </View>
        <Switch
          value={preferCalmMotion}
          onValueChange={setPreferCalmMotion}
          accessibilityLabel={t('appearance.calmMotion')}
        />
      </View>
      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <Text style={styles.switchTitle}>{t('game.weekOff')}</Text>
          <Text style={styles.switchHint}>{t('game.weekOffHint')}</Text>
        </View>
        <Switch
          testID="appearance-week-ring"
          value={showWeekRing}
          onValueChange={setShowWeekRing}
          accessibilityLabel={t('game.weekOff')}
        />
      </View>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 12 },
    group: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.label,
      lineHeight: lineHeights.label,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    row: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      overflow: 'hidden',
      backgroundColor: colors.card,
    },
    seg: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      paddingHorizontal: 6,
    },
    segBorder: { borderRightWidth: 1, borderRightColor: colors.border },
    segActive: { backgroundColor: colors.accent },
    segText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.label,
      lineHeight: lineHeights.label,
      fontWeight: '600',
      color: colors.textMuted,
    },
    segTextActive: { color: colors.onAccent },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      padding: 14,
    },
    switchCopy: { flex: 1, gap: 4 },
    switchTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
      fontWeight: '600',
      color: colors.text,
    },
    switchHint: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      color: colors.textMuted,
    },
  });
}
