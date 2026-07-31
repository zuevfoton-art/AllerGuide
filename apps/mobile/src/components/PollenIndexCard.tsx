import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { POLLEN_UPI_MAX, type PollenUpiSnapshot } from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface PollenIndexCardProps {
  taxonLabel: string;
  upi: PollenUpiSnapshot | null;
  grainsPerM3?: number | null;
  levelLabel?: string | null;
}

export function PollenIndexCard({
  taxonLabel,
  upi,
  grainsPerM3,
  levelLabel,
}: PollenIndexCardProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const index = upi?.index ?? 0;
  const progress = index / POLLEN_UPI_MAX;

  return (
    <View style={styles.card}>
      <View style={styles.gaugeWrap}>
        <View style={styles.gaugeTrack}>
          <View
            style={[
              styles.gaugeFill,
              {
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: upiColor(index, theme),
              },
            ]}
          />
        </View>
        <Text style={styles.gaugeValue}>
          {index}/{POLLEN_UPI_MAX}
        </Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{t('map.upiTitle')}</Text>
        <Text style={[styles.subtitle, { color: upiColor(index, theme) }]}>
          {taxonLabel}
          {levelLabel ? ` · ${levelLabel}` : ''}
        </Text>
        {typeof grainsPerM3 === 'number' ? (
          <Text style={styles.meta}>
            {t('map.pollenValue', { value: grainsPerM3.toFixed(1) })}
          </Text>
        ) : null}
        {upi?.source === 'google' ? (
          <Text style={styles.meta}>{t('map.upiSourceGoogle')}</Text>
        ) : (
          <Text style={styles.meta}>{t('map.upiSourceOpenMeteo')}</Text>
        )}
      </View>
    </View>
  );
}

function upiColor(index: number, theme: AppTheme): string {
  if (index >= 4) return theme.colors.danger;
  if (index === 3) return theme.colors.warning;
  if (index >= 1) return theme.colors.success;
  return theme.colors.textMuted;
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: 14,
      alignItems: 'center',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 14,
    },
    gaugeWrap: { width: 72, alignItems: 'center', gap: 6 },
    gaugeTrack: {
      width: '100%',
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surfaceMuted,
      overflow: 'hidden',
    },
    gaugeFill: { height: '100%', borderRadius: 4 },
    gaugeValue: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 18,
      color: colors.head,
    },
    copy: { flex: 1, gap: 2 },
    title: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      color: colors.head,
    },
    subtitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
    },
    meta: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
    },
  });
}
