import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { ImageCropRect } from '@/src/services/scanner-photo-geometry';

export type {
  DisplayCropBox,
  DisplayCropDragKind,
  DisplayLayout,
  ImageCropRect,
} from '@/src/services/scanner-photo-geometry';

export {
  applyDisplayCropDrag,
  computeContainLayout,
  initialCropInDisplay,
  mapDisplayCropToImagePixels,
} from '@/src/services/scanner-photo-geometry';

export type CapturedScanPhoto = {
  uri: string;
  width: number;
  height: number;
};

export type CroppedScanPhoto = {
  uri: string;
  base64: string;
  mimeType: string;
  width: number;
  height: number;
};

const MAX_OUTPUT_WIDTH = 1600;

export async function cropImageToBase64(
  uri: string,
  crop: ImageCropRect,
  options?: { maxWidth?: number },
): Promise<CroppedScanPhoto> {
  const maxWidth = options?.maxWidth ?? MAX_OUTPUT_WIDTH;
  const actions: Parameters<typeof manipulateAsync>[1] = [{ crop }];

  if (crop.width > maxWidth) {
    actions.push({ resize: { width: maxWidth } });
  }

  const result = await manipulateAsync(uri, actions, {
    compress: 0.75,
    format: SaveFormat.JPEG,
    base64: true,
  });

  if (!result.base64) {
    throw new Error('Image crop did not return base64 data');
  }

  return {
    uri: result.uri,
    base64: result.base64,
    mimeType: 'image/jpeg',
    width: result.width,
    height: result.height,
  };
}

/** Encode a picked photo without a crop rect (web / fallback). */
export async function encodeImageToBase64(
  uri: string,
  options?: { maxWidth?: number },
): Promise<CroppedScanPhoto> {
  const maxWidth = options?.maxWidth ?? MAX_OUTPUT_WIDTH;
  const result = await manipulateAsync(uri, [{ resize: { width: maxWidth } }], {
    compress: 0.75,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!result.base64) {
    throw new Error('Image encode did not return base64 data');
  }
  return {
    uri: result.uri,
    base64: result.base64,
    mimeType: 'image/jpeg',
    width: result.width,
    height: result.height,
  };
}

export async function pickScanPhotoFromLibrary(): Promise<CapturedScanPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    base64: false,
  });
  if (picked.canceled || !picked.assets?.[0]?.uri) return null;

  const asset = picked.assets[0];
  return {
    uri: asset.uri,
    width: asset.width || 0,
    height: asset.height || 0,
  };
}

/**
 * Web / fallback: system camera → still photo for the crop step.
 * Native OCR modes prefer in-app `CameraView.takePictureAsync`.
 */
export async function captureScanPhotoViaPicker(): Promise<CapturedScanPhoto | null> {
  if (Platform.OS === 'web') {
    return pickScanPhotoFromLibrary();
  }

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const captured = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });
  if (captured.canceled || !captured.assets?.[0]?.uri) return null;

  const asset = captured.assets[0];
  return {
    uri: asset.uri,
    width: asset.width || 0,
    height: asset.height || 0,
  };
}
