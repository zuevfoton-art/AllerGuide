import { Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import {
  preferBitmapImageSize,
  type ImageCropRect,
} from '@/src/services/scanner-photo-geometry';

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
  preferBitmapImageSize,
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

export function resolveScanPhotoSize(
  uri: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => {
        if (width > 0 && height > 0) {
          resolve({ width, height });
          return;
        }
        reject(new Error('Image size is zero'));
      },
      (error) => {
        reject(error ?? new Error('Could not read image size'));
      },
    );
  });
}

/**
 * Resolve the bitmap that crop/manipulator will read. Image picker / camera
 * width can be 0 (web) or disagree with EXIF-oriented `Image.getSize`.
 */
export async function prepareScanPhotoForCrop(
  photo: CapturedScanPhoto,
): Promise<CapturedScanPhoto> {
  let measured: { width: number; height: number } | null = null;
  try {
    measured = await resolveScanPhotoSize(photo.uri);
  } catch {
    measured = null;
  }

  const bitmap = measured
    ? preferBitmapImageSize({ width: photo.width, height: photo.height }, measured)
    : { width: photo.width, height: photo.height };

  const pickerDisagreesWithFile =
    measured != null &&
    photo.width > 0 &&
    photo.height > 0 &&
    (photo.width !== measured.width || photo.height !== measured.height);

  if (pickerDisagreesWithFile) {
    try {
      const baked = await manipulateAsync(photo.uri, [], {
        compress: 1,
        format: SaveFormat.JPEG,
      });
      if (baked.width > 0 && baked.height > 0) {
        return { uri: baked.uri, width: baked.width, height: baked.height };
      }
    } catch {
      // Fall through to the larger of picker vs getSize on the original URI.
    }
  }

  return {
    uri: photo.uri,
    width: bitmap.width || photo.width,
    height: bitmap.height || photo.height,
  };
}

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
