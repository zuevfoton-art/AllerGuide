import { Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import {
  fullImageCropRect,
  mapDisplayCropToImagePixels,
  preferBitmapImageSize,
  type DisplayCropBox,
  type DisplayLayout,
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
  fullImageCropRect,
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
const MAX_NORMALIZE_EDGE = 2560;
const JPEG_QUALITY = 0.92;
const CROP_JPEG_QUALITY = 0.75;

type WebBitmapSource = {
  width: number;
  height: number;
  draw(ctx: CanvasRenderingContext2D, sx: number, sy: number, sw: number, sh: number, dw: number, dh: number): void;
  close?: () => void;
};

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

export function isNormalizedJpegDataUrl(uri: string): boolean {
  return uri.startsWith('data:image/jpeg');
}

/**
 * Map the on-screen crop box to bitmap pixels. If the frame is not ready yet,
 * use the whole photo so "Use crop" still produces a JPEG.
 */
export function resolveScanPhotoCropRect(params: {
  imageWidth: number;
  imageHeight: number;
  layout: DisplayLayout | null;
  crop: DisplayCropBox | null;
}): ImageCropRect {
  const { imageWidth, imageHeight, layout, crop } = params;
  if (!crop || !layout || layout.displayWidth <= 0 || layout.displayHeight <= 0) {
    return fullImageCropRect(imageWidth, imageHeight);
  }
  return mapDisplayCropToImagePixels({
    imageWidth,
    imageHeight,
    layout,
    cropX: crop.x,
    cropY: crop.y,
    cropWidth: crop.width,
    cropHeight: crop.height,
  });
}

function canUseWebBitmap(): boolean {
  return Platform.OS === 'web' && typeof document !== 'undefined';
}

function scaledSize(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const edge = Math.max(width, height);
  if (edge <= maxEdge) return { width, height };
  const scale = maxEdge / edge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

function croppedFromJpegDataUrl(
  dataUrl: string,
  width: number,
  height: number,
): CroppedScanPhoto {
  return {
    uri: dataUrl,
    base64: dataUrlToBase64(dataUrl),
    mimeType: 'image/jpeg',
    width,
    height,
  };
}

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Could not read photo');
  }
  return response.blob();
}

async function loadHtmlImage(uri: string): Promise<WebBitmapSource> {
  const imageCtor = globalThis.Image;
  if (typeof imageCtor !== 'function') {
    throw new Error('HTML image decode is unavailable');
  }
  const image = new imageCtor();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Could not decode photo'));
    image.src = uri;
  });
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (width <= 0 || height <= 0) {
    throw new Error('Decoded photo has no size');
  }
  return {
    width,
    height,
    draw(ctx, sx, sy, sw, sh, dw, dh) {
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, dw, dh);
    },
  };
}

async function loadWebBitmap(uri: string): Promise<WebBitmapSource> {
  if (typeof createImageBitmap === 'function') {
    try {
      const blob = await uriToBlob(uri);
      const bitmap = await createImageBitmap(blob, {
        imageOrientation: 'from-image',
      } as ImageBitmapOptions);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw(ctx, sx, sy, sw, sh, dw, dh) {
          ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, dw, dh);
        },
        close: () => bitmap.close(),
      };
    } catch {
      // HEIC / revoked blob / missing EXIF option — fall through to HTML Image.
    }
  }
  return loadHtmlImage(uri);
}

function renderJpegDataUrl(
  source: WebBitmapSource,
  crop: ImageCropRect,
  maxEdge: number,
  quality: number,
): { dataUrl: string; width: number; height: number } {
  const originX = Math.max(0, Math.min(crop.originX, Math.max(0, source.width - 1)));
  const originY = Math.max(0, Math.min(crop.originY, Math.max(0, source.height - 1)));
  const sourceWidth = Math.max(1, Math.min(crop.width, source.width - originX));
  const sourceHeight = Math.max(1, Math.min(crop.height, source.height - originY));
  const output = scaledSize(sourceWidth, sourceHeight, maxEdge);

  const canvas = document.createElement('canvas');
  canvas.width = output.width;
  canvas.height = output.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas is unavailable');
  }
  source.draw(ctx, originX, originY, sourceWidth, sourceHeight, output.width, output.height);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  if (!dataUrl.startsWith('data:image/jpeg')) {
    throw new Error('Canvas did not produce a JPEG');
  }
  return { dataUrl, width: output.width, height: output.height };
}

async function normalizeScanPhotoOnWeb(uri: string): Promise<CapturedScanPhoto> {
  const source = await loadWebBitmap(uri);
  try {
    const rendered = renderJpegDataUrl(
      source,
      fullImageCropRect(source.width, source.height),
      MAX_NORMALIZE_EDGE,
      JPEG_QUALITY,
    );
    return { uri: rendered.dataUrl, width: rendered.width, height: rendered.height };
  } finally {
    source.close?.();
  }
}

async function cropScanPhotoOnWeb(
  uri: string,
  crop: ImageCropRect | null,
  maxWidth: number,
): Promise<CroppedScanPhoto> {
  const source = await loadWebBitmap(uri);
  try {
    const rect = crop ?? fullImageCropRect(source.width, source.height);
    const rendered = renderJpegDataUrl(source, rect, maxWidth, CROP_JPEG_QUALITY);
    return croppedFromJpegDataUrl(rendered.dataUrl, rendered.width, rendered.height);
  } finally {
    source.close?.();
  }
}

async function bakeScanPhotoOnNative(photo: CapturedScanPhoto): Promise<CapturedScanPhoto> {
  const baked = await manipulateAsync(photo.uri, [], {
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });
  if (baked.width > 0 && baked.height > 0) {
    return { uri: baked.uri, width: baked.width, height: baked.height };
  }

  let measured: { width: number; height: number } | null = null;
  try {
    measured = await resolveScanPhotoSize(baked.uri || photo.uri);
  } catch {
    measured = null;
  }
  const bitmap = measured
    ? preferBitmapImageSize({ width: photo.width, height: photo.height }, measured)
    : { width: photo.width, height: photo.height };
  return {
    uri: baked.uri || photo.uri,
    width: bitmap.width || photo.width,
    height: bitmap.height || photo.height,
  };
}

/**
 * Always decode the picked/captured file into a JPEG the cropper can show.
 * Web: createImageBitmap / canvas (EXIF-aware) → data URL.
 * Native: expo-image-manipulator bake so Android/iOS crop uses oriented pixels.
 */
export async function prepareScanPhotoForCrop(
  photo: CapturedScanPhoto,
): Promise<CapturedScanPhoto> {
  if (isNormalizedJpegDataUrl(photo.uri) && photo.width > 0 && photo.height > 0) {
    return photo;
  }

  if (canUseWebBitmap()) {
    try {
      return await normalizeScanPhotoOnWeb(photo.uri);
    } catch {
      // Fall through to manipulator / getSize so Android WebView still works.
    }
  }

  try {
    return await bakeScanPhotoOnNative(photo);
  } catch {
    // Keep a displayable URI even if bake fails.
  }

  let measured: { width: number; height: number } | null = null;
  try {
    measured = await resolveScanPhotoSize(photo.uri);
  } catch {
    measured = null;
  }
  const bitmap = measured
    ? preferBitmapImageSize({ width: photo.width, height: photo.height }, measured)
    : { width: photo.width, height: photo.height };
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

  if (canUseWebBitmap()) {
    try {
      return await cropScanPhotoOnWeb(uri, crop, maxWidth);
    } catch {
      // Fall through to manipulator so a missing canvas still encodes.
    }
  }

  const actions: Parameters<typeof manipulateAsync>[1] = [{ crop }];
  if (crop.width > maxWidth) {
    actions.push({ resize: { width: maxWidth } });
  }

  const result = await manipulateAsync(uri, actions, {
    compress: CROP_JPEG_QUALITY,
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

  if (canUseWebBitmap()) {
    try {
      return await cropScanPhotoOnWeb(uri, null, maxWidth);
    } catch {
      // Fall through to manipulator.
    }
  }

  const result = await manipulateAsync(uri, [{ resize: { width: maxWidth } }], {
    compress: CROP_JPEG_QUALITY,
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

async function capturedAssetFromPicker(
  asset: ImagePicker.ImagePickerAsset,
): Promise<CapturedScanPhoto> {
  return prepareScanPhotoForCrop({
    uri: asset.uri,
    width: asset.width || 0,
    height: asset.height || 0,
  });
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

  return capturedAssetFromPicker(picked.assets[0]);
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

  return capturedAssetFromPicker(captured.assets[0]);
}
