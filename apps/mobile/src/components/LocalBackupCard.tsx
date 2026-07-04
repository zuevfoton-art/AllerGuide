import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { pickAndImportLocalBackup, shareLocalBackupFile } from '@/src/services/backup-file-service';
import { useTranslation } from '@/src/store/locale-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { fontSizes } from '@/src/constants/typography';

export function LocalBackupCard() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const result = await shareLocalBackupFile();
      Alert.alert(
        result.ok ? t('settings.syncSuccess') : t('settings.syncError'),
        result.ok ? t('settings.localBackupExportSuccess') : result.error,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    Alert.alert(t('settings.localBackupImportTitle'), t('settings.localBackupImportMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.import'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setLoading(true);
            try {
              const result = await pickAndImportLocalBackup();
              Alert.alert(
                result.ok ? t('settings.syncSuccess') : t('settings.syncError'),
                result.ok ? t('settings.localBackupImportSuccess') : result.error,
              );
            } finally {
              setLoading(false);
            }
          })();
        },
      },
    ]);
  };

  return (
    <GlassCard>
      <Text style={styles.cardHint}>{t('settings.localBackupDesc')}</Text>
      <Button
        testID="local-backup-export"
        label={t('settings.export')}
        variant="primary"
        block
        disabled={loading}
        onPress={() => void handleExport()}
      />
      <Button
        testID="local-backup-import"
        label={t('settings.import')}
        variant="secondary"
        block
        disabled={loading}
        onPress={handleImport}
      />
    </GlassCard>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    cardHint: {
      fontSize: fontSizes.bodySm,
      color: theme.colors.textMuted,
      marginBottom: 12,
      lineHeight: 20,
    },
  });
}
