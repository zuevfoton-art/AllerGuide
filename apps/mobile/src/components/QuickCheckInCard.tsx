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
};

/** One-tap 0–3 severity check-in for the return-quick-checkin Home card. */
export function QuickCheckInCard({ profileId, onSaved }: QuickCheckInCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

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
      onSaved?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard testID="quick-check-in" variant="soft">
      <CardTitle>{t('reengagement.checkInTitle')}</CardTitle>
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
  });
}
