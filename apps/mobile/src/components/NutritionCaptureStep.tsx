import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, View } from 'react-native';
import type { DishEnrichmentResult } from '@/src/services/dish-off-enrichment-service';
import { Button } from '@/src/components/Button';
import { ImageCropEditor } from '@/src/components/ImageCropEditor';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { recognizeDiaryDishFromPhoto } from '@/src/services/diary-dish-recognition-service';
import {
  captureScanPhotoViaPicker,
  encodeImageToBase64,
  pickScanPhotoFromLibrary,
  type CapturedScanPhoto,
  type CroppedScanPhoto,
} from '@/src/services/scanner-photo-service';

type StepState = 'idle' | 'crop' | 'recognizing' | 'result';

type Props = {
  onEnterManually: () => void;
  onContinue: (input: { food: string; enrichment: DishEnrichmentResult }) => void;
};

export function NutritionCaptureStep({ onEnterManually, onContinue }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [state, setState] = useState<StepState>('idle');
  const [pendingPhoto, setPendingPhoto] = useState<CapturedScanPhoto | null>(null);
  const [cropped, setCropped] = useState<CroppedScanPhoto | null>(null);
  const [food, setFood] = useState('');
  const [enrichment, setEnrichment] = useState<DishEnrichmentResult | null>(null);
  const [error, setError] = useState('');

  const startCapture = async (fromGallery: boolean) => {
    setError('');
    const photo = fromGallery
      ? await pickScanPhotoFromLibrary()
      : await captureScanPhotoViaPicker();
    if (!photo) return;
    if (Platform.OS === 'web') {
      try {
        const encoded = await encodeImageToBase64(photo.uri);
        await recognizeCropped(encoded);
      } catch {
        setError(t('nutritionScan.notRecognized'));
      }
      return;
    }
    setPendingPhoto(photo);
    setState('crop');
  };

  const recognizeCropped = async (photo: CroppedScanPhoto) => {
    setCropped(photo);
    setPendingPhoto(null);
    setState('recognizing');
    setError('');
    try {
      const outcome = await recognizeDiaryDishFromPhoto({
        imageBase64: photo.base64,
        mimeType: photo.mimeType,
      });
      if (!outcome) {
        setError(t('nutritionScan.notRecognized'));
        setState('idle');
        return;
      }
      setFood(outcome.food);
      setEnrichment(outcome.enrichment);
      setState('result');
    } catch {
      setError(t('nutritionScan.notRecognized'));
      setState('idle');
    }
  };

  if (state === 'crop' && pendingPhoto) {
    return (
      <ImageCropEditor
        photo={pendingPhoto}
        title={t('nutritionScan.cropTitle')}
        hint={t('nutritionScan.cropHint')}
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
      <View style={styles.wrap} testID="nutrition-photo-recognizing">
        <ActivityIndicator color={theme.colors.accent} />
        <Text style={styles.subtitle}>{t('nutritionScan.recognizing')}</Text>
      </View>
    );
  }

  if (state === 'result' && enrichment && food) {
    return (
      <View style={styles.wrap} testID="nutrition-photo-result">
        {cropped ? <Image source={{ uri: cropped.uri }} style={styles.preview} /> : null}
        <Text style={styles.title}>{food}</Text>
        <Text style={styles.subtitle}>
          {enrichment.components.map((item) => item.nameRu).join(', ')}
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          testID="nutrition-photo-continue"
          label={t('common.next')}
          onPress={() => onContinue({ food, enrichment })}
        />
        <Button
          label={t('nutritionScan.enterManually')}
          variant="ghost"
          onPress={onEnterManually}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap} testID="nutrition-capture-step">
      <Text style={styles.title}>{t('nutritionScan.title')}</Text>
      <Text style={styles.subtitle}>{t('nutritionScan.subtitle')}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        testID="nutrition-photo-camera"
        label={t('nutritionScan.photograph')}
        onPress={() => void startCapture(false)}
      />
      <Button
        testID="nutrition-photo-gallery"
        label={t('nutritionScan.gallery')}
        variant="secondary"
        onPress={() => void startCapture(true)}
      />
      <Button
        testID="nutrition-enter-manual"
        label={t('nutritionScan.enterManually')}
        variant="ghost"
        onPress={onEnterManually}
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
    error: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.danger,
    },
  });
}
