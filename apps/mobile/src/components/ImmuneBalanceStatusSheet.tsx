import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/src/components/BottomSheet';
import { density, space } from '@/src/constants/layout';
import { fontSizes, lineHeights } from '@/src/constants/typography';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useMemo } from 'react';
import type { WellnessSnapshot } from '@/src/services/wellness-service';
import { useTranslation } from '@/src/store/locale-store';

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

export function ImmuneBalanceStatusSheet({
  visible,
  wellness,
  onClose,
}: ImmuneBalanceStatusSheetProps) {
  const theme = useTheme();
  const ui = useUiStyles();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <BottomSheet
      visible={visible}
      title={t('home.numbersTitle')}
      onClose={onClose}
      testID="immune-balance-status-sheet">
      {wellness ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={ui.kpiRow}>
            <Text style={ui.kpiLabel}>{t('home.index')}</Text>
            <Text style={ui.kpiValue}>
              {t(`wellness.index.${wellness.display.indexTier}`)} · {wellness.score}/100
            </Text>
          </View>
          <PercentRow label={t('home.pollen')} value={wellness.rings.pollen} detail={wellness.factors[0]?.value} />
          <PercentRow label={t('home.air')} value={wellness.rings.air} detail={wellness.factors[1]?.value} />
          <PercentRow label={t('home.diary')} value={wellness.rings.diary} detail={wellness.factors[2]?.value} />
          {wellness.rings.clinical != null ? (
            <PercentRow label={t('home.clinical')} value={wellness.rings.clinical} />
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
          {wellness.rings.clinical != null && wellness.clinicalScales.some((s) => s.scaleId === 'act') ? (
            <Text style={styles.detail}>{t('home.scaleGinaHint')}</Text>
          ) : null}
          <Text style={styles.summary}>{wellness.statusSummary}</Text>
        </ScrollView>
      ) : null}
    </BottomSheet>
  );
}

function PercentRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail?: string;
}) {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.scaleBlock}>
      <View style={ui.kpiRow}>
        <Text style={ui.kpiLabel}>{label}</Text>
        <Text style={ui.kpiValue}>{value}%</Text>
      </View>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    scroll: { flex: 1, minHeight: 0 },
    content: { paddingHorizontal: space[4], paddingBottom: density.tapMinHeight, gap: space[2] },
    scaleBlock: { gap: space[1] },
    detail: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.caption,
      lineHeight: lineHeights.caption,
      color: colors.textMuted,
    },
    summary: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      color: colors.textSecondary,
      marginTop: space[2],
    },
  });
}
