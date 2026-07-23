import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { parseDiaryPhotoUris, serializeDiaryPhotoUris } from '@allerguide/core';

const MAX_PHOTOS = 5;

export async function pickDiaryPhotoFromLibrary(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsMultipleSelection: false,
  });
  if (picked.canceled || !picked.assets[0]?.uri) return null;
  return picked.assets[0].uri;
}

export async function captureDiaryPhoto(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return pickDiaryPhotoFromLibrary();
  }

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const captured = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.7,
  });
  if (captured.canceled || !captured.assets[0]?.uri) return null;
  return captured.assets[0].uri;
}

export function addPhotoUri(currentRaw: string, uri: string): string {
  const uris = parseDiaryPhotoUris(currentRaw);
  if (uris.includes(uri) || uris.length >= MAX_PHOTOS) {
    return serializeDiaryPhotoUris(uris);
  }
  return serializeDiaryPhotoUris([...uris, uri]);
}

export function removePhotoUri(currentRaw: string, uri: string): string {
  return serializeDiaryPhotoUris(parseDiaryPhotoUris(currentRaw).filter((item) => item !== uri));
}

export function canAddMorePhotos(currentRaw: string): boolean {
  return parseDiaryPhotoUris(currentRaw).length < MAX_PHOTOS;
}
