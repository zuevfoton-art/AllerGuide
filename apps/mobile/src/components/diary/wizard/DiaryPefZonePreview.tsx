import { useMemo } from 'react';
import { Text, View } from 'react-native';
import type { PefZone } from '@allerguide/core';
import { createPefZoneStyles } from '@/src/components/diary/wizard/diary-wizard-styles';
import { useTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

export function DiaryPefZonePreview({
  zone,
  percent,
}: {
  zone: PefZone;
  percent: number | null;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createPefZoneStyles(theme), [theme]);
  const { t } = useTranslation();
  const color =
    zone === 'green'
      ? theme.colors.success
      : zone === 'yellow'
        ? theme.colors.warning
        : theme.colors.danger;

  return (
    <View style={[styles.wrap, { borderColor: color, backgroundColor: `${color}14` }]}>
      <Text style={[styles.title, { color }]}>
        {t('diaryWizard.pefZone', { zone: t(`asthma.zone.${zone}`), percent: percent ?? '—' })}
      </Text>
      <Text style={styles.hint}>{t(`asthma.zoneHint.${zone}`)}</Text>
    </View>
  );
}
