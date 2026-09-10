import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMemo, useState } from 'react';
import { SEVERITY_0_3_CHOICES } from '@allerguide/core';
import { GlassCard } from '@/src/components/GlassCard';
import { CardTitle } from '@/src/components/CardTitle';
import { density, radii } from '@/src/constants/layout';
import { fontSizes, lineHeights } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { saveQuickCheckIn } from '@/src/services/reengagement-service';
import { showStatusBanner } from '@/src/store/banner-store';

type QuickCheckInCardProps = {
  profileId: number;
  onSaved?: () => void;
  /** Collapses the chips into an «already logged · change» row. */
  checkedInToday?: boolean;
};

/** One-tap 0–3 severity check-in — the permanent daily ritual of Today (north-star §4.1). */
export function QuickCheckInCard({ profileId, onSaved, checkedInToday }: QuickCheckInCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const chipsVisible = !checkedInToday || editing;

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
      setEditing(false);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard testID="quick-check-in" variant="soft">
      <CardTitle>{t('reengagement.checkInTitle')}</CardTitle>
      {chipsVisible ? (
        <>
          <Text style={styles.hint}>{t('reengagement.checkInHint')}</Text>
          <View style={styles.row}>
            {SEVERITY_0_3_CHOICES.map((label, index) => (
              <Pressable
                key={label}
                testID={`quick-check-in-${index}`}
                style={styles.chip}
                onPress={() => void save(index as 0 | 1 | 2 | 3)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={label}
                hitSlop={4}>
                <Text style={styles.chipNum}>{index}</Text>
                <Text style={styles.chipLabel} numberOfLines={1}>
                  {label.replace(/^\d\s—\s/, '')}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <Pressable
          testID="quick-check-in-change"
          style={styles.doneRow}
          onPress={() => setEditing(true)}
          accessibilityRole="button"
          accessibilityLabel={`${t('today.checkedIn')} · ${t('today.checkedInChange')}`}>
          <Text style={styles.doneText}>{t('today.checkedIn')}</Text>
          <Text style={styles.doneLink}>{t('today.checkedInChange')}</Text>
        </Pressable>
      )}
    </GlassCard>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    hint: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    row: { flexDirection: 'row', gap: 8 },
    chip: {
      flex: 1,
      minHeight: density.tapMinHeight,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
      gap: 2,
    },
    chipNum: {
      fontFamily: fonts.sansBold,
      fontSize: fontSizes.h4,
      lineHeight: lineHeights.h4,
      color: colors.head,
    },
    chipLabel: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.caption,
      lineHeight: lineHeights.caption,
      color: colors.textMuted,
    },
    doneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      minHeight: density.tapMinHeight,
    },
    doneText: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.body,
      lineHeight: lineHeights.body,
      color: colors.textSecondary,
    },
    doneLink: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.bodySm,
      lineHeight: lineHeights.bodySm,
      fontWeight: '600',
      color: colors.accent,
    },
  });
}
