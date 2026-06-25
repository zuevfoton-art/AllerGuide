import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import {
  cancelVoiceDictation,
  isVoiceInputSupported,
  mergeVoiceIntoField,
  startVoiceDictation,
  stopVoiceDictation,
  type VoiceDictationState,
} from '@/src/services/voice-note-service';

interface VoiceNoteButtonProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function VoiceNoteButton({ value, onChange, disabled }: VoiceNoteButtonProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, locale } = useTranslation();
  const [state, setState] = useState<VoiceDictationState>('idle');
  const supported = isVoiceInputSupported();

  const handleError = useCallback(
    (error: unknown) => {
      const code = error instanceof Error ? error.message : '';
      const message =
        code === 'VOICE_PERMISSION_DENIED'
          ? t('voiceNote.permissionDenied')
          : code === 'VOICE_NOT_SUPPORTED'
            ? t('voiceNote.notSupported')
            : code === 'VOICE_CLOUD_REQUIRED'
              ? t('voiceNote.cloudRequired')
              : t('voiceNote.failed');
      Alert.alert(t('voiceNote.title'), message);
    },
    [t],
  );

  const toggleRecording = useCallback(async () => {
    if (disabled || !supported) return;

    if (state === 'recording') {
      setState('transcribing');
      try {
        const transcript = await stopVoiceDictation(locale);
        if (transcript) {
          onChange(mergeVoiceIntoField(value, transcript));
        }
      } catch (error) {
        handleError(error);
      } finally {
        setState('idle');
      }
      return;
    }

    try {
      await startVoiceDictation(locale);
      setState('recording');
    } catch (error) {
      handleError(error);
    }
  }, [disabled, supported, state, locale, value, onChange, handleError]);

  const handleCancel = useCallback(async () => {
    await cancelVoiceDictation();
    setState('idle');
  }, []);

  if (!supported) {
    return (
      <Text style={styles.hint}>{t('voiceNote.notSupported')}</Text>
    );
  }

  const isRecording = state === 'recording';
  const isBusy = state === 'transcribing';

  return (
    <View style={styles.wrap}>
      <Pressable
        style={[
          styles.micBtn,
          isRecording && styles.micBtnActive,
          (disabled || isBusy) && styles.micBtnDisabled,
        ]}
        disabled={disabled || isBusy}
        onPress={toggleRecording}
        accessibilityRole="button"
        accessibilityLabel={isRecording ? t('voiceNote.stopRecording') : t('voiceNote.startRecording')}>
        {isBusy ? (
          <ActivityIndicator color={theme.colors.onAccent} size="small" />
        ) : (
          <Ionicons
            name={isRecording ? 'stop-circle' : 'mic'}
            size={22}
            color={isRecording ? theme.colors.danger : theme.colors.accent}
          />
        )}
        <Text style={[styles.micLabel, isRecording && styles.micLabelRecording]}>
          {isBusy
            ? t('voiceNote.transcribing')
            : isRecording
              ? t('voiceNote.stopRecording')
              : t('voiceNote.tapToSpeak')}
        </Text>
      </Pressable>
      {isRecording ? (
        <Pressable onPress={handleCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    hint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
    },
    micBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderInput,
      backgroundColor: colors.surfaceMuted,
    },
    micBtnActive: {
      borderColor: colors.danger,
      backgroundColor: colors.card,
    },
    micBtnDisabled: { opacity: 0.5 },
    micLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      flex: 1,
    },
    micLabelRecording: { color: colors.danger },
    cancelBtn: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 4 },
    cancelText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
  });
}
