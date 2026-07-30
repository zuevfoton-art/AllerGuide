import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

/**
 * Gallery pick for prescription photo (optional path from camera UI).
 */
export async function pickPrescriptionPhotoFromLibrary(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });
  if (picked.canceled || !picked.assets?.[0]?.uri) return null;
  return picked.assets[0].uri;
}

/**
 * System camera still (web falls back to gallery — no live CameraView).
 * Native screens prefer in-app CameraView; this is the fallback / web path.
 */
export async function capturePrescriptionPhotoViaPicker(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return pickPrescriptionPhotoFromLibrary();
  }

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const captured = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });
  if (captured.canceled || !captured.assets?.[0]?.uri) return null;
  return captured.assets[0].uri;
}

export async function pickPrescriptionPdf(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
  if (result.canceled || !result.assets?.[0]?.uri) return null;
  return result.assets[0].uri;
}
