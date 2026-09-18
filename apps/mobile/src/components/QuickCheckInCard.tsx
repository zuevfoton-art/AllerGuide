import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMemo, useState } from 'react';
import { SEVERITY_0_3_LABELS, type Severity0_3 } from '@allerguide/core';
import { GlassCard } from '@/src/components/GlassCard';
import { CardTitle } from '@/src/components/CardTitle';
import { BottomSheet } from '@/src/components/BottomSheet';
import { density, radii, space } from '@/src/constants/layout';
import { fontSizes, lineHeights } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { saveQuickCheckIn } from '@/src/services/reengagement-service';
import { showStatusBanner } from '@/src/store/banner-store';

/** Severity 0–3 → face shown in the check-in bubble (a11y still uses text labels). */
const FEELING_SMILES: Record<Severity0_3, string> = {
  0: '😊',
  1: '😐',
  2: '😕',
  3: '😣',
};

type QuickCheckInCardProps = {
  profileId: number;
  onSaved?: () => void;
  checkedInToday?: boolean;
  compact?: boolean;
};

export function QuickCheckInCard({
  profileId,
  onSaved,
  checkedInToday,
  compact = false,
}: QuickCheckInCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<Severity0_3 | null>(null);

  const save = async (index: Severity0_3) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await saveQuickCheckIn(profileId, index);
      if (!result.ok) {
        showStatusBanner({ tone: 'error', message: t('common.error') });
        return;
      }
      setSelected(index);
      showStatusBanner({ tone: 'success', message: t('reengagement.checkInSaved') });
      setSheetOpen(false);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  };

  const subtitle =
    checkedInToday || selected != null
      ? t('today.checkedIn')
      : t('home.feelMark');
  const showInlineSmiles = compact && !checkedInToday && selected == null;

  const smileRow = (layout: 'grid' | 'sheet') => (
    <View
      style={layout === 'grid' ? styles.smileRow : styles.sheetBody}
      accessibilityRole="radiogroup">
      {([0, 1, 2, 3] as const).map((index) => {
        const active = selected === index;
        return (
          <Pressable
            key={index}
            testID={`quick-check-in-${index}`}
            style={[
              layout === 'grid' ? styles.smileBtn : styles.sheetSmile,
              active ? styles.smileBtnActive : null,
            ]}
            onPress={() => void save(index)}
            disabled={busy}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, disabled: busy }}
            accessibilityLabel={SEVERITY_0_3_LABELS[index]}>
            <Text style={layout === 'grid' ? styles.smileGlyph : styles.sheetSmileGlyph}>
              {FEELING_SMILES[index]}
            </Text>
            {layout === 'sheet' ? (
              <Text style={styles.sheetLabel}>{SEVERITY_0_3_LABELS[index]}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <>
      {showInlineSmiles ? (
        <View
          testID="quick-check-in"
          accessibilityRole="summary"
          accessibilityLabel={`${t('reengagement.checkInTitle')}. ${t('reengagement.checkInHint')}`}
          style={styles.compactWrap}>
          <GlassCard variant="soft" style={styles.compactCard}>
            <CardTitle>{t('reengagement.checkInTitle')}</CardTitle>
            <Text style={styles.hint} numberOfLines={2}>
              {t('reengagement.checkInHint')}
            </Text>
            {smileRow('grid')}
          </GlassCard>
        </View>
      ) : (
        <Pressable
          testID="quick-check-in"
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${t('reengagement.checkInTitle')}. ${subtitle}`}
          style={compact ? styles.compactWrap : undefined}>
          <GlassCard variant="soft" style={compact ? styles.compactCard : undefined}>
            <CardTitle>{t('reengagement.checkInTitle')}</CardTitle>
            {compact && selected != null ? (
              <View style={styles.savedFace} accessibilityLabel={SEVERITY_0_3_LABELS[selected]}>
                <Text style={styles.savedSmile}>{FEELING_SMILES[selected]}</Text>
                <Text style={styles.hint} numberOfLines={1}>
                  {SEVERITY_0_3_LABELS[selected]}
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.hint} numberOfLines={2}>
                  {subtitle}
                </Text>
                {compact ? null : (
                  <Text style={styles.hint}>{t('reengagement.checkInHint')}</Text>
                )}
              </>
            )}
          </GlassCard>
        </Pressable>
      )}

      {!showInlineSmiles ? (
        <BottomSheet
          visible={sheetOpen}
          title={t('home.feelPickTitle')}
          onClose={() => setSheetOpen(false)}
          testID="feeling-check-in-sheet">
          {smileRow('sheet')}
        </BottomSheet>
      ) : null}
    </>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    compactWrap: { flex: 1, minWidth: 0 },
    compactCard: { flex: 1, minHeight: density.tapMinHeight * 2 },
    hint: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      color: colors.textSecondary,
      marginTop: space[2],
    },
    smileRow: {
      marginTop: space[3],
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: space[1],
    },
    smileBtn: {
      flex: 1,
      minWidth: 0,
      minHeight: density.tapMinHeight,
      borderRadius: radii.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space[2],
    },
    smileBtnActive: {
      backgroundColor: colors.accentLight,
      borderColor: colors.accent,
    },
    smileGlyph: {
      fontSize: fontSizes.h2,
      lineHeight: lineHeights.h2,
      textAlign: 'center',
    },
    savedFace: {
      marginTop: space[3],
      alignItems: 'center',
      gap: space[1],
    },
    savedSmile: {
      fontSize: fontSizes.display,
      lineHeight: lineHeights.display,
      textAlign: 'center',
    },
    sheetBody: {
      paddingHorizontal: space[4],
      paddingBottom: density.tapMinHeight,
      gap: space[2],
    },
    sheetSmile: {
      minHeight: density.tapMinHeight,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: space[3],
      flexDirection: 'row',
      alignItems: 'center',
      gap: space[3],
    },
    sheetSmileGlyph: {
      fontSize: fontSizes.h2,
      lineHeight: lineHeights.h2,
      width: 40,
      textAlign: 'center',
    },
    sheetLabel: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
      color: colors.text,
      flex: 1,
    },
  });
}
