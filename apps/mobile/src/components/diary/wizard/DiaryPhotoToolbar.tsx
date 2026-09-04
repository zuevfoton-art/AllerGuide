import { useMemo } from 'react';
import { Image, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { parseDiaryPhotoUris } from '@allerguide/core';
import { useTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import {
  addPhotoUri,
  canAddMorePhotos,
  captureDiaryPhoto,
  pickDiaryPhotoFromLibrary,
  removePhotoUri,
} from '@/src/services/diary-photo-picker';
import { createFieldStyles } from '@/src/components/diary/wizard/diary-wizard-styles';

export function DiaryPhotoToolbar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createFieldStyles(theme), [theme]);
  const { t } = useTranslation();
  const uris = parseDiaryPhotoUris(value);
  const canAdd = canAddMorePhotos(value);

  const addFromLibrary = async () => {
    const uri = await pickDiaryPhotoFromLibrary();
    if (uri) onChange(addPhotoUri(value, uri));
  };
  const addFromCamera = async () => {
    const uri = await captureDiaryPhoto();
    if (uri) onChange(addPhotoUri(value, uri));
  };

  return (
    <View style={styles.photoWrap} testID="diary-photo-step">
      <Text style={styles.photoHint}>{t('diaryWizard.photoHint')}</Text>
      <View style={styles.photoActions}>
        {Platform.OS !== 'web' ? (
          <Pressable
            style={[styles.photoBtn, !canAdd && styles.btnDisabled]}
            disabled={!canAdd}
            onPress={() => void addFromCamera()}
            testID="diary-photo-camera">
            <Ionicons name="camera-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.photoBtnText}>{t('diaryWizard.photoCamera')}</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.photoBtn, !canAdd && styles.btnDisabled]}
          disabled={!canAdd}
          onPress={() => void addFromLibrary()}
          testID="diary-photo-library">
          <Ionicons name="images-outline" size={18} color={theme.colors.accent} />
          <Text style={styles.photoBtnText}>{t('diaryWizard.photoLibrary')}</Text>
        </Pressable>
      </View>
      {uris.length ? (
        <View style={styles.photoGrid}>
          {uris.map((uri) => (
            <View key={uri} style={styles.photoThumbWrap}>
              <Image source={{ uri }} style={styles.photoThumb} />
              <Pressable
                style={styles.photoRemove}
                onPress={() => onChange(removePhotoUri(value, uri))}
                accessibilityRole="button"
                accessibilityLabel={t('diaryWizard.photoRemove')}>
                <Ionicons name="close-circle" size={22} color={theme.colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.photoEmpty}>{t('diaryWizard.photoEmpty')}</Text>
      )}
    </View>
  );
}
