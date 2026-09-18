import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BottomSheet } from '@/src/components/BottomSheet';
import { TierScale } from '@/src/components/TierScale';
import { density, space } from '@/src/constants/layout';
import { fontSizes, lineHeights } from '@/src/constants/typography';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { resolveZoneColors, zoneFromWellnessVerbalTier } from '@/src/hooks/use-zone-colors';
import type { WellnessSnapshot } from '@/src/services/wellness-service';
import { useTranslation } from '@/src/store/locale-store';
import type { WellnessVerbalTier } from '@allerguide/core';
import { Ionicons } from '@expo/vector-icons';

type ImmuneBalanceStatusSheetProps = {
  visible: boolean;
  wellness: WellnessSnapshot | null;
  onClose: () => void;
};

function scaleNameKey(scaleId: string): string {
  if (scaleId === 'act') return 'home.scaleAct';
  if (scaleId === 'aria-lite') return 'home.scaleAria';
  if (scaleId === 'scorad-lite') return 'home.scaleScorad';
  if (scaleId === 'uas7') return 'home.scaleUas7';
  return 'home.clinical';
}

function verbalTierIndex(tier: WellnessVerbalTier): number {
  if (tier === 'none') return 0;
  if (tier === 'low') return 1;
  if (tier === 'moderate') return 2;
  if (tier === 'high') return 3;
  return 0;
}

/** Detail sheet: status copy + factor rows (opened from «Подробнее» under the rings). */
export function ImmuneBalanceStatusSheet({
  visible,
  wellness,
  onClose,
}: ImmuneBalanceStatusSheetProps) {
  const theme = useTheme();
  const ui = useUiStyles();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const go = (href: string) => {
    onClose();
    router.push(href as never);
  };

  return (
    <BottomSheet
      visible={visible}
      title={t('home.wellnessDetails')}
      onClose={onClose}
      testID="immune-balance-status-sheet">
      {wellness ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={styles.statusTitle}>{wellness.statusTitle}</Text>
          <Text style={styles.summary}>{wellness.statusSummary}</Text>

          <View style={ui.kpiRow}>
            <Text style={ui.kpiLabel}>{t('home.index')}</Text>
            <Text style={ui.kpiValue}>
              {t(`wellness.index.${wellness.display.indexTier}`)} · {wellness.score}/100
            </Text>
          </View>

          <Text style={styles.sectionLabel}>{t('home.factors')}</Text>

          <FactorRow
            testID="home-factor-pollen"
            label={t('home.pollen')}
            valueLabel={t(`wellness.pollen.${wellness.display.pollenTier}`)}
            tier={wellness.display.pollenTier}
            percent={wellness.rings.pollen}
            detail={wellness.factors[0]?.value}
            accessibilityLabel={t('home.factorOpenPollen')}
            onPress={() => go('/(tabs)/map?layer=pollen')}
          />
          <FactorRow
            testID="home-factor-air"
            label={t('home.air')}
            valueLabel={t(`wellness.air.${wellness.display.airTier}`)}
            tier={wellness.display.airTier}
            percent={wellness.rings.air}
            detail={wellness.factors[1]?.value}
            accessibilityLabel={t('home.factorOpenAir')}
            onPress={() => go('/(tabs)/map?layer=air')}
          />
          <FactorRow
            testID="home-factor-diary"
            label={t('home.diary')}
            valueLabel={t(`wellness.diaryState.${wellness.display.diaryTier}`)}
            tier={wellness.display.diaryTier}
            percent={wellness.rings.diary}
            detail={wellness.factors[2]?.value}
            accessibilityLabel={t('home.factorOpenDiary')}
            onPress={() => go('/(tabs)/diary')}
          />
          {wellness.rings.clinical != null ? (
            <Pressable
              testID="home-factor-clinical"
              onPress={() => go('/clinical-scales')}
              accessibilityRole="button"
              accessibilityLabel={t('home.factorOpenClinical')}
              style={styles.factorRow}>
              <Text style={ui.kpiLabel}>{t('home.clinical')}</Text>
              <Text style={ui.kpiValue}>{wellness.rings.clinical}%</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}

          {wellness.clinicalScales.map((scale) => (
            <View key={scale.scaleId} style={styles.scaleBlock}>
              <View style={ui.kpiRow}>
                <Text style={ui.kpiLabel}>{t(scaleNameKey(scale.scaleId))}</Text>
                <Text style={ui.kpiValue}>{scale.total}</Text>
              </View>
              {scale.interpretation ? (
                <Text style={styles.detail}>{scale.interpretation}</Text>
              ) : null}
            </View>
          ))}
          {wellness.rings.clinical != null &&
          wellness.clinicalScales.some((s) => s.scaleId === 'act') ? (
            <Text style={styles.detail}>{t('home.scaleGinaHint')}</Text>
          ) : null}
        </ScrollView>
      ) : null}
    </BottomSheet>
  );
}

function FactorRow({
  testID,
  label,
  valueLabel,
  tier,
  percent,
  detail,
  accessibilityLabel,
  onPress,
}: {
  testID: string;
  label: string;
  valueLabel: string;
  tier: WellnessVerbalTier;
  percent: number;
  detail?: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const zone = zoneFromWellnessVerbalTier(tier);
  const colors = resolveZoneColors(zone, theme.colors);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.factorRow}>
      <View style={styles.factorBody}>
        <View style={ui.kpiRow}>
          <Text style={ui.kpiLabel}>{label}</Text>
          <Text style={ui.kpiValue}>{percent}%</Text>
        </View>
        <View style={styles.factorMeta}>
          <TierScale activeIndex={verbalTierIndex(tier)} zone={zone} />
          <Text style={[styles.valueLabel, colors ? { color: colors.fg } : null]}>{valueLabel}</Text>
        </View>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
    </Pressable>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    scroll: { flex: 1, minHeight: 0 },
    content: { paddingHorizontal: space[4], paddingBottom: density.tapMinHeight, gap: space[3] },
    statusTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.h4,
      lineHeight: lineHeights.h4,
      fontWeight: '600',
      color: colors.head,
    },
    summary: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      color: colors.textSecondary,
    },
    sectionLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.label,
      lineHeight: lineHeights.label,
      fontWeight: '600',
      color: colors.textMuted,
      marginTop: space[1],
    },
    factorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      minHeight: density.tapMinHeight,
    },
    factorBody: { flex: 1, minWidth: 0, gap: space[1] },
    factorMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[2],
      flexWrap: 'wrap',
    },
    valueLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.label,
      lineHeight: lineHeights.label,
      fontWeight: '600',
      color: colors.head,
    },
    scaleBlock: { gap: space[1] },
    detail: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.caption,
      lineHeight: lineHeights.caption,
      color: colors.textMuted,
    },
  });
}
