import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMemo, useState } from 'react';
import { SEVERITY_0_3_CHOICES } from '@allerguide/core';
import { GlassCard } from '@/src/components/GlassCard';
import { CardTitle } from '@/src/components/CardTitle';
import { BottomSheet } from '@/src/components/BottomSheet';
import { density, radii, space } from '@/src/constants/layout';
import { fontSizes, lineHeights } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { saveQuickCheckIn } from '@/src/services/reengagement-service';
import { showStatusBanner } from '@/src/store/banner-store';

type QuickCheckInCardProps = {
  profileId: number;
  onSaved?: () => void;
  checkedInToday?: boolean;
  compact?: boolean;
};

function chipLabel(choice: string): string {
  return choice.replace(/^\d\s—\s/, '');
}

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

  const save = async (index: 0 | 1 | 2 | 3) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await saveQuickCheckIn(profileId, index);
      if (!result.ok) {
        showStatusBanner({ tone: 'error', message: t('common.error') });
        return;
      }
      showStatusBanner({ tone: 'success', message: t('reengagement.checkInSaved') });
      setSheetOpen(false);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  };

  const subtitle = checkedInToday ? t('today.checkedIn') : t('home.feelMark');

  return (
    <>
      <Pressable
        testID="quick-check-in"
        onPress={() => setSheetOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${t('reengagement.checkInTitle')}. ${subtitle}`}
        style={compact ? styles.compactWrap : undefined}>
        <GlassCard variant="soft" style={compact ? styles.compactCard : undefined}>
          <CardTitle>{t('reengagement.checkInTitle')}</CardTitle>
          <Text style={styles.hint} numberOfLines={2}>
            {subtitle}
          </Text>
          {compact ? null : (
            <Text style={styles.hint}>{t('reengagement.checkInHint')}</Text>
          )}
        </GlassCard>
      </Pressable>

      <BottomSheet
        visible={sheetOpen}
        title={t('home.feelPickTitle')}
        onClose={() => setSheetOpen(false)}
        testID="feeling-check-in-sheet">
        <View style={styles.sheetBody}>
          {SEVERITY_0_3_CHOICES.map((label, index) => (
            <Pressable
              key={label}
              testID={`quick-check-in-${index}`}
              style={styles.sheetChip}
              onPress={() => void save(index as 0 | 1 | 2 | 3)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={label}>
              <Text style={styles.chipNum}>{index}</Text>
              <Text style={styles.chipLabel}>{chipLabel(label)}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
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
    sheetBody: {
      paddingHorizontal: 16,
      paddingBottom: density.tapMinHeight,
      gap: space[2],
    },
    sheetChip: {
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
    chipNum: {
      fontFamily: fonts.sansBold,
      fontSize: fontSizes.h4,
      lineHeight: lineHeights.h4,
      color: colors.head,
      width: 24,
    },
    chipLabel: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
      color: colors.text,
      flex: 1,
    },
  });
}
