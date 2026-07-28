import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import {
  cancelVoiceDictation,
  isVoiceInputSupported,
  startVoiceDictation,
  stopVoiceDictation,
  type VoiceDictationState,
} from '@/src/services/voice-dictation-service';

interface VoiceNoteButtonProps {
  /** Called with the final transcript when recognition ends successfully. */
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
  testID?: string;
}

export function VoiceNoteButton({ onTranscript, disabled, testID }: VoiceNoteButtonProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, locale } = useTranslation();
  const [state, setState] = useState<VoiceDictationState>('idle');
  const supported = isVoiceInputSupported();

  const handleError = useCallback(
    (code: string) => {
      const message =
        code === 'VOICE_PERMISSION_DENIED'
          ? t('voiceNote.permissionDenied')
          : code === 'VOICE_NOT_SUPPORTED'
            ? t('voiceNote.notSupported')
            : t('voiceNote.failed');
      Alert.alert(t('voiceNote.title'), message);
      setState('idle');
    },
    [t],
  );

  const toggle = useCallback(async () => {
    if (disabled || !supported) return;

    if (state === 'listening') {
      await stopVoiceDictation();
      return;
    }

    try {
      await startVoiceDictation(locale, {
        onResult: (transcript) => {
          setState('idle');
          if (transcript.trim()) onTranscript(transcript.trim());
        },
        onError: handleError,
      });
      setState('listening');
    } catch (error) {
      const code = error instanceof Error ? error.message : 'VOICE_RECOGNITION_FAILED';
      handleError(code);
    }
  }, [disabled, supported, state, locale, onTranscript, handleError]);

  const handleCancel = useCallback(async () => {
    await cancelVoiceDictation();
    setState('idle');
  }, []);

  if (!supported) {
    return (
      <Text style={styles.hint} testID={testID ? `${testID}-unsupported` : undefined}>
        {t('voiceNote.notSupported')}
      </Text>
    );
  }

  const isListening = state === 'listening';

  return (
    <View style={styles.wrap} testID={testID}>
      <Pressable
        style={[styles.micBtn, isListening && styles.micBtnActive, disabled && styles.micBtnDisabled]}
        disabled={disabled}
        onPress={() => void toggle()}
        accessibilityRole="button"
        accessibilityLabel={
          isListening ? t('voiceNote.stopRecording') : t('voiceNote.startRecording')
        }
        testID={testID ? `${testID}-mic` : 'voice-note-mic'}>
        {isListening ? (
          <ActivityIndicator color={theme.colors.danger} size="small" />
        ) : (
          <Ionicons name="mic" size={20} color={theme.colors.accent} />
        )}
        <Text style={[styles.micLabel, isListening && styles.micLabelRecording]}>
          {isListening ? t('voiceNote.listening') : t('voiceNote.tapToSpeak')}
        </Text>
      </Pressable>
      {isListening ? (
        <Pressable onPress={() => void handleCancel()} style={styles.cancelBtn}>
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
      backgroundColor: colors.surfaceMuted ?? colors.card,
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
