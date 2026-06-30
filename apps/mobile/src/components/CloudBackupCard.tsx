import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { RecoveryKeyModal, type RecoveryKeyModalMode } from '@/src/components/RecoveryKeyModal';
import { CLOUD_SYNC_ENABLED } from '@/src/constants/features';
import {
  hasRecoveryKey,
  isRecoveryKeyConfirmed,
  markRecoveryKeyConfirmed,
  usesLegacyDeviceKeyOnly,
} from '@/src/services/backup-crypto';
import { downloadBackup, uploadBackup, type SyncErrorCode } from '@/src/services/sync-service';
import { useTranslation } from '@/src/store/locale-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { fontSizes } from '@/src/constants/typography';

function syncErrorMessage(code: SyncErrorCode, fallback: string, t: (key: string) => string): string {
  switch (code) {
    case 'wrong_recovery_key':
      return t('settings.recoveryKeyWrong');
    case 'recovery_key_required':
      return t('settings.recoveryKeyRequired');
    default:
      return fallback;
  }
}

export function CloudBackupCard() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<RecoveryKeyModalMode>('setup');
  const [pendingAction, setPendingAction] = useState<'upload' | 'download' | null>(null);

  if (!CLOUD_SYNC_ENABLED) return null;

  const openModal = (mode: RecoveryKeyModalMode, action: 'upload' | 'download') => {
    setModalMode(mode);
    setPendingAction(action);
    setModalVisible(true);
  };

  const runUpload = async () => {
    setLoading(true);
    try {
      const result = await uploadBackup();
      Alert.alert(
        result.ok ? t('settings.syncSuccess') : t('settings.syncError'),
        result.ok ? t('settings.uploadSuccess') : syncErrorMessage(result.code, result.error, t),
      );
    } finally {
      setLoading(false);
    }
  };

  const runDownload = async (recoveryKey?: string) => {
    setLoading(true);
    try {
      const result = await downloadBackup(recoveryKey ? { recoveryKey } : undefined);
      Alert.alert(
        result.ok ? t('settings.syncSuccess') : t('settings.syncError'),
        result.ok ? t('settings.downloadSuccess') : syncErrorMessage(result.code, result.error, t),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = () => {
    if (usesLegacyDeviceKeyOnly()) {
      openModal('migrate', 'upload');
      return;
    }
    if (!hasRecoveryKey() || !isRecoveryKeyConfirmed()) {
      openModal('setup', 'upload');
      return;
    }
    void runUpload();
  };

  const handleDownload = () => {
    if (!hasRecoveryKey()) {
      openModal('enter', 'download');
      return;
    }
    void runDownload();
  };

  const handleModalConfirmed = (normalizedKey: string) => {
    setModalVisible(false);
    markRecoveryKeyConfirmed();

    if (pendingAction === 'upload') {
      void runUpload();
      return;
    }

    void runDownload(normalizedKey);
    setPendingAction(null);
  };

  return (
    <>
      <GlassCard>
        <Text style={styles.cardHint}>{t('settings.cloudBackupDesc')}</Text>
        <Button
          label={t('settings.uploadBackup')}
          variant="primary"
          block
          disabled={loading}
          onPress={() => void handleUpload()}
        />
        <Button
          label={t('settings.downloadBackup')}
          variant="secondary"
          block
          disabled={loading}
          onPress={() => void handleDownload()}
        />
      </GlassCard>

      <RecoveryKeyModal
        visible={modalVisible}
        mode={modalMode}
        onClose={() => {
          setModalVisible(false);
          setPendingAction(null);
        }}
        onConfirmed={handleModalConfirmed}
      />
    </>
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
