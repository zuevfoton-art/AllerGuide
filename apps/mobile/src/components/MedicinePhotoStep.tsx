import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from 'react-native';
import type { MedicineAgeResolution, MedicineCard } from '@allerguide/core';
import { Button } from '@/src/components/Button';
import { ImageCropEditor } from '@/src/components/ImageCropEditor';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import {
  recognizeMedicineFromVoice,
  recognizeMedicinePackage,
} from '@/src/services/medicine-recognition-service';
import {
  cancelVoiceDictation,
  isVoiceInputSupported,
  startVoiceDictation,
  stopVoiceDictation,
  type VoiceDictationState,
} from '@/src/services/voice-dictation-service';
import {
  captureScanPhotoViaPicker,
  pickScanPhotoFromLibrary,
  prepareScanPhotoForCrop,
  type CapturedScanPhoto,
  type CroppedScanPhoto,
} from '@/src/services/scanner-photo-service';

type StepState = 'idle' | 'crop' | 'recognizing' | 'result';

type Props = {
  ageYears: number | null;
  onSkip: () => void;
  onContinue: (input: {
    card: MedicineCard;
    ageUsage: MedicineAgeResolution | null;
    photoUri?: string;
  }) => void;
};

export function MedicineRecognitionNotice({
  card,
  ageUsage,
}: {
  card: MedicineCard;
  ageUsage: MedicineAgeResolution | null;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View testID="medicine-recognition-notice" style={styles.card}>
      <Text style={styles.kicker}>{t('medicineScan.name')}</Text>
      <Text style={styles.title}>{card.name}</Text>
      {card.activeSubstance ? (
        <>
          <Text style={styles.kicker}>{t('medicineScan.activeSubstance')}</Text>
          <Text style={styles.body}>{card.activeSubstance}</Text>
        </>
      ) : null}
      {card.form ? (
        <>
          <Text style={styles.kicker}>{t('medicineScan.form')}</Text>
          <Text style={styles.body}>{card.form}</Text>
        </>
      ) : null}
      {card.strength ? (
        <>
          <Text style={styles.kicker}>{t('medicineScan.strength')}</Text>
          <Text style={styles.body}>{card.strength}</Text>
        </>
      ) : null}
      {card.indications ? (
        <>
          <Text style={styles.kicker}>{t('medicineScan.usage')}</Text>
          <Text style={styles.body}>{card.indications}</Text>
        </>
      ) : null}
      {ageUsage?.warning || (ageUsage?.blocked && card.minAgeYears != null) ? (
        <Text style={styles.warning}>
          {t('medicineScan.ageWarning', { years: String(card.minAgeYears ?? '') })}
        </Text>
      ) : null}
      <Text style={styles.disclaimer}>{t('medicineScan.disclaimer')}</Text>
    </View>
  );
}

export function MedicinePhotoStep({ ageYears, onSkip, onContinue }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, locale } = useTranslation();
  const [state, setState] = useState<StepState>('idle');
  const [pendingPhoto, setPendingPhoto] = useState<CapturedScanPhoto | null>(null);
  const [cropped, setCropped] = useState<CroppedScanPhoto | null>(null);
  const [transcript, setTranscript] = useState('');
  const [voiceState, setVoiceState] = useState<VoiceDictationState>('idle');
  const [card, setCard] = useState<MedicineCard | null>(null);
  const [ageUsage, setAgeUsage] = useState<MedicineAgeResolution | null>(null);
  const [error, setError] = useState('');
  const voiceSupported = isVoiceInputSupported();

  const startCapture = async (fromGallery: boolean) => {
    setError('');
    const photo = fromGallery
      ? await pickScanPhotoFromLibrary()
      : await captureScanPhotoViaPicker();
    if (!photo) return;
    setPendingPhoto(await prepareScanPhotoForCrop(photo));
    setState('crop');
  };

  const recognizeCropped = async (photo: CroppedScanPhoto) => {
    setCropped(photo);
    setPendingPhoto(null);
    setState('recognizing');
    setError('');
    try {
      const outcome = await recognizeMedicinePackage({
        imageBase64: photo.base64,
        mimeType: photo.mimeType,
        ageYears,
      });
      if (!outcome.card) {
        setError(
          outcome.hintCode === 'cloud_disabled'
            ? t('medicineScan.cloudOff')
            : t('medicineScan.notRecognized'),
        );
        setState('idle');
        return;
      }
      if (outcome.hintCode === 'cloud_disabled' || outcome.hintCode === 'cloud_failed') {
        setError(
          outcome.hintCode === 'cloud_disabled'
            ? t('medicineScan.cloudOff')
            : t('medicineScan.notRecognized'),
        );
      }
      setCard(outcome.card);
      setAgeUsage(outcome.ageUsage);
      setState('result');
    } catch {
      setError(t('medicineScan.notRecognized'));
      setState('idle');
    }
  };

  const applyVoiceTranscript = useCallback(
    async (spoken: string) => {
      setTranscript(spoken);
      setCropped(null);
      setState('recognizing');
      setError('');
      try {
        const outcome = await recognizeMedicineFromVoice({
          transcript: spoken,
          ageYears,
        });
        if (!outcome.card) {
          setError(t('medicineScan.voiceNotRecognized'));
          setState('idle');
          return;
        }
        setCard(outcome.card);
        setAgeUsage(outcome.ageUsage);
        setState('result');
      } catch {
        setError(t('medicineScan.voiceNotRecognized'));
        setState('idle');
      }
    },
    [ageYears, t],
  );

  const handleVoiceError = useCallback(
    (code: string) => {
      const message =
        code === 'VOICE_PERMISSION_DENIED'
          ? t('voiceNote.permissionDenied')
          : code === 'VOICE_NOT_SUPPORTED'
            ? t('voiceNote.notSupported')
            : t('voiceNote.failed');
      Alert.alert(t('voiceNote.title'), message);
      setVoiceState('idle');
    },
    [t],
  );

  const toggleVoice = useCallback(async () => {
    if (!voiceSupported || voiceState === 'processing') return;
    if (voiceState === 'listening') {
      await stopVoiceDictation(locale);
      return;
    }
    setError('');
    try {
      await startVoiceDictation(locale, {
        onResult: (spoken) => {
          setVoiceState('idle');
          if (spoken.trim()) void applyVoiceTranscript(spoken.trim());
        },
        onError: handleVoiceError,
        onStateChange: setVoiceState,
      });
      setVoiceState('listening');
    } catch (error) {
      const code = error instanceof Error ? error.message : 'VOICE_RECOGNITION_FAILED';
      handleVoiceError(code);
    }
  }, [voiceSupported, voiceState, locale, applyVoiceTranscript, handleVoiceError]);

  if (state === 'crop' && pendingPhoto) {
    return (
      <ImageCropEditor
        photo={pendingPhoto}
        title={t('medicineScan.cropTitle')}
        hint={t('medicineScan.cropHint')}
        confirmLabel={t('scanner.cropConfirm')}
        cancelLabel={t('common.cancel')}
        retakeLabel={t('scanner.cropRetake')}
        errorLabel={t('scanner.cropFailed')}
        onCancel={() => {
          setPendingPhoto(null);
          setState('idle');
        }}
        onRetake={() => {
          setPendingPhoto(null);
          setState('idle');
          void startCapture(false);
        }}
        onConfirm={(next) => void recognizeCropped(next)}
      />
    );
  }

  if (state === 'recognizing') {
    return (
      <View style={styles.wrap} testID="medicine-photo-recognizing">
        <ActivityIndicator color={theme.colors.accent} />
        <Text style={styles.subtitle}>
          {transcript && !cropped ? t('medicineScan.recognizingVoice') : t('medicineScan.recognizing')}
        </Text>
      </View>
    );
  }

  if (state === 'result' && card && (cropped || transcript)) {
    return (
      <View style={styles.wrap} testID="medicine-photo-result">
        {cropped ? <Image source={{ uri: cropped.uri }} style={styles.preview} /> : null}
        {transcript && !cropped ? (
          <>
            <Text style={styles.kicker}>{t('medicineScan.transcript')}</Text>
            <Text style={styles.body}>{transcript}</Text>
          </>
        ) : null}
        <MedicineRecognitionNotice card={card} ageUsage={ageUsage} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          testID="medicine-photo-continue"
          label={t('medicineScan.continue')}
          onPress={() =>
            onContinue({
              card,
              ageUsage,
              photoUri: cropped?.uri,
            })
          }
        />
        <Button
          label={t('medicineScan.fillManually')}
          variant="ghost"
          onPress={onSkip}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap} testID="medicine-photo-step">
      <Text style={styles.title}>{t('medicineScan.title')}</Text>
      <Text style={styles.subtitle}>{t('medicineScan.subtitle')}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        testID="medicine-photo-camera"
        label={t('medicineScan.photograph')}
        onPress={() => {
          void cancelVoiceDictation();
          setVoiceState('idle');
          void startCapture(false);
        }}
      />
      {voiceSupported ? (
        <Button
          testID="medicine-photo-voice"
          label={
            voiceState === 'listening'
              ? t('voiceNote.listening')
              : voiceState === 'processing'
                ? t('voiceNote.processing')
                : t('medicineScan.recordVoice')
          }
          variant="secondary"
          disabled={voiceState === 'processing'}
          onPress={() => void toggleVoice()}
        />
      ) : (
        <Text testID="medicine-photo-voice-unsupported" style={styles.subtitle}>
          {t('voiceNote.notSupported')}
        </Text>
      )}
      <Button
        testID="medicine-photo-gallery"
        label={t('medicineScan.gallery')}
        variant="secondary"
        onPress={() => {
          void cancelVoiceDictation();
          setVoiceState('idle');
          void startCapture(true);
        }}
      />
      <Button
        testID="medicine-photo-manual"
        label={t('medicineScan.fillManually')}
        variant="ghost"
        onPress={() => {
          void cancelVoiceDictation();
          onSkip();
        }}
      />
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 12 },
    title: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 18,
      fontWeight: '600',
      color: colors.head,
    },
    subtitle: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    preview: {
      width: '100%',
      height: 160,
      borderRadius: 8,
      backgroundColor: colors.surfaceMuted,
    },
    card: {
      gap: 6,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
    },
    kicker: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
    body: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.text,
    },
    warning: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.danger,
      marginTop: 4,
    },
    disclaimer: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
      marginTop: 4,
    },
    error: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.danger,
    },
  });
}
