import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '@/src/components/Button';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { fontSizes } from '@/src/constants/typography';
import { radii } from '@/src/constants/layout';
import { useTranslation } from '@/src/store/locale-store';
import {
  formatRecoveryKeyForDisplay,
  generateRecoveryKey,
  normalizeRecoveryKey,
  setRecoveryKey,
} from '@/src/services/backup-crypto';

export type RecoveryKeyModalMode = 'setup' | 'enter' | 'migrate';

type RecoveryKeyModalProps = {
  visible: boolean;
  mode: RecoveryKeyModalMode;
  onClose: () => void;
  onConfirmed: (normalizedKey: string) => void;
};

export function RecoveryKeyModal({ visible, mode, onClose, onConfirmed }: RecoveryKeyModalProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [generatedKey] = useState(() => generateRecoveryKey());
  const [enteredKey, setEnteredKey] = useState('');
  const [savedAck, setSavedAck] = useState(false);

  const title =
    mode === 'enter'
      ? t('settings.recoveryKeyEnterTitle')
      : mode === 'migrate'
        ? t('settings.recoveryKeyMigrateTitle')
        : t('settings.recoveryKeySetupTitle');

  const description =
    mode === 'enter'
      ? t('settings.recoveryKeyEnterDesc')
      : mode === 'migrate'
        ? t('settings.recoveryKeyMigrateDesc')
        : t('settings.recoveryKeySetupDesc');

  const displayKey = formatRecoveryKeyForDisplay(generatedKey);

  const handleConfirm = () => {
    if (mode === 'enter') {
      const normalized = normalizeRecoveryKey(enteredKey);
      if (!normalized) return;
      onConfirmed(normalized);
      setEnteredKey('');
      return;
    }

    if (!savedAck) return;
    const result = setRecoveryKey(generatedKey);
    if (!result.ok) return;
    onConfirmed(generatedKey);
    setSavedAck(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.desc}>{description}</Text>

          {mode === 'enter' ? (
            <TextInput
              style={styles.input}
              value={enteredKey}
              onChangeText={setEnteredKey}
              placeholder={t('settings.recoveryKeyEnterPlaceholder')}
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : (
            <>
              <Text style={styles.keyLabel}>{t('settings.recoveryKeyDisplayLabel')}</Text>
              <Text selectable style={styles.keyValue}>
                {displayKey}
              </Text>
              <Text style={styles.hint}>{t('settings.recoveryKeyCopyHint')}</Text>
              <Pressable
                style={styles.checkRow}
                onPress={() => setSavedAck((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: savedAck }}>
                <View style={[styles.checkbox, savedAck && styles.checkboxOn]} />
                <Text style={styles.checkLabel}>{t('settings.recoveryKeyConfirmSaved')}</Text>
              </Pressable>
            </>
          )}

          <View style={styles.actions}>
            <Button label={t('common.cancel')} variant="secondary" onPress={onClose} />
            <Button
              label={t('common.next')}
              variant="primary"
              disabled={mode === 'enter' ? !normalizeRecoveryKey(enteredKey) : !savedAck}
              onPress={handleConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: 20,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: radii.lg,
      padding: 20,
      gap: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    title: {
      fontSize: fontSizes.h3,
      fontWeight: '700',
      color: theme.colors.text,
    },
    desc: {
      fontSize: fontSizes.bodySm,
      color: theme.colors.textMuted,
      lineHeight: 20,
    },
    keyLabel: {
      fontSize: fontSizes.caption,
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    keyValue: {
      fontSize: fontSizes.bodySm,
      fontFamily: 'monospace',
      color: theme.colors.text,
      lineHeight: 22,
    },
    hint: {
      fontSize: fontSizes.caption,
      color: theme.colors.textMuted,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: theme.colors.text,
      fontSize: fontSizes.bodySm,
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    checkboxOn: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    checkLabel: {
      flex: 1,
      fontSize: fontSizes.bodySm,
      color: theme.colors.text,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 8,
      marginTop: 4,
    },
  });
}
