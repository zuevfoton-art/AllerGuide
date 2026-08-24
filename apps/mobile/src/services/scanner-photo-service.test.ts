import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Image, Platform } from 'react-native';
import { manipulateAsync } from 'expo-image-manipulator';
import {
  cropImageToBase64,
  encodeImageToBase64,
  prepareScanPhotoForCrop,
  resolveScanPhotoCropRect,
} from '@/src/services/scanner-photo-service';

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Image: { getSize: vi.fn() },
}));

vi.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: vi.fn(),
  requestCameraPermissionsAsync: vi.fn(),
  launchImageLibraryAsync: vi.fn(),
  launchCameraAsync: vi.fn(),
}));

vi.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  manipulateAsync: vi.fn(),
}));

function stubWebCanvas(dataUrl = 'data:image/jpeg;base64,Zm9v') {
  const drawImage = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      blob: async () => new Blob(['x'], { type: 'image/jpeg' }),
    })),
  );
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({
      width: 800,
      height: 600,
      close: vi.fn(),
    })),
  );
  vi.stubGlobal('document', {
    createElement: (tag: string) => {
      if (tag !== 'canvas') return {};
      return {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage }),
        toDataURL: () => dataUrl,
      };
    },
  });
  return { drawImage };
}

describe('prepareScanPhotoForCrop', () => {
  beforeEach(() => {
    Platform.OS = 'ios';
    vi.mocked(Image.getSize).mockReset();
    vi.mocked(manipulateAsync).mockReset();
    vi.unstubAllGlobals();
  });

  it('always bakes a JPEG so the cropper has oriented pixels', async () => {
    vi.mocked(manipulateAsync).mockResolvedValue({
      uri: 'file://baked.jpg',
      width: 3024,
      height: 4032,
      base64: undefined,
    });

    const prepared = await prepareScanPhotoForCrop({
      uri: 'file://label.jpg',
      width: 3024,
      height: 4032,
    });

    expect(prepared).toEqual({ uri: 'file://baked.jpg', width: 3024, height: 4032 });
    expect(manipulateAsync).toHaveBeenCalled();
  });

  it('falls back to Image.getSize when bake fails and picker left size empty', async () => {
    vi.mocked(manipulateAsync).mockRejectedValue(new Error('bake failed'));
    vi.mocked(Image.getSize).mockImplementation((_uri, success) => {
      success(3024, 4032);
    });

    const prepared = await prepareScanPhotoForCrop({
      uri: 'file://label.jpg',
      width: 0,
      height: 0,
    });

    expect(prepared).toEqual({ uri: 'file://label.jpg', width: 3024, height: 4032 });
  });

  it('re-encodes when picker and getSize disagree so crop uses manipulator pixels', async () => {
    vi.mocked(manipulateAsync).mockResolvedValue({
      uri: 'file://baked.jpg',
      width: 4032,
      height: 3024,
      base64: undefined,
    });

    const prepared = await prepareScanPhotoForCrop({
      uri: 'file://label.jpg',
      width: 4032,
      height: 3024,
    });

    expect(prepared).toEqual({ uri: 'file://baked.jpg', width: 4032, height: 3024 });
  });

  it('bakes EXIF when picker size is swapped versus getSize', async () => {
    vi.mocked(manipulateAsync).mockResolvedValue({
      uri: 'file://baked.jpg',
      width: 3024,
      height: 4032,
      base64: undefined,
    });

    const prepared = await prepareScanPhotoForCrop({
      uri: 'file://camera.jpg',
      width: 4032,
      height: 3024,
    });

    expect(prepared).toEqual({ uri: 'file://baked.jpg', width: 3024, height: 4032 });
  });

  it('returns a JPEG data URL unchanged so the cropper can show it immediately', async () => {
    const photo = { uri: 'data:image/jpeg;base64,abc', width: 800, height: 600 };
    await expect(prepareScanPhotoForCrop(photo)).resolves.toEqual(photo);
    expect(manipulateAsync).not.toHaveBeenCalled();
  });

  it('normalizes a web blob URL to a JPEG data URL via createImageBitmap', async () => {
    Platform.OS = 'web';
    stubWebCanvas('data:image/jpeg;base64,d2Vi');

    const prepared = await prepareScanPhotoForCrop({
      uri: 'blob:https://localhost/photo',
      width: 0,
      height: 0,
    });

    expect(prepared.uri).toBe('data:image/jpeg;base64,d2Vi');
    expect(prepared.width).toBe(800);
    expect(prepared.height).toBe(600);
    expect(manipulateAsync).not.toHaveBeenCalled();
  });
});

describe('resolveScanPhotoCropRect', () => {
  it('uses the whole photo when the crop frame is not ready', () => {
    expect(
      resolveScanPhotoCropRect({
        imageWidth: 1600,
        imageHeight: 900,
        layout: null,
        crop: null,
      }),
    ).toEqual({ originX: 0, originY: 0, width: 1600, height: 900 });
  });

  it('maps a ready display crop onto bitmap pixels', () => {
    const pixels = resolveScanPhotoCropRect({
      imageWidth: 1000,
      imageHeight: 1000,
      layout: { displayWidth: 200, displayHeight: 200, offsetX: 0, offsetY: 0 },
      crop: { x: 20, y: 20, width: 160, height: 160 },
    });
    expect(pixels.originX).toBe(100);
    expect(pixels.originY).toBe(100);
    expect(pixels.width).toBe(800);
    expect(pixels.height).toBe(800);
  });
});

describe('cropImageToBase64', () => {
  beforeEach(() => {
    Platform.OS = 'ios';
    vi.mocked(manipulateAsync).mockReset();
    vi.unstubAllGlobals();
  });

  it('crops through the manipulator on native', async () => {
    vi.mocked(manipulateAsync).mockResolvedValue({
      uri: 'file://crop.jpg',
      width: 400,
      height: 300,
      base64: 'Y3JvcA==',
    });

    const cropped = await cropImageToBase64('file://photo.jpg', {
      originX: 10,
      originY: 20,
      width: 400,
      height: 300,
    });

    expect(cropped).toEqual({
      uri: 'file://crop.jpg',
      width: 400,
      height: 300,
      base64: 'Y3JvcA==',
      mimeType: 'image/jpeg',
    });
  });

  it('crops a data URL on web with canvas and keeps JPEG base64', async () => {
    Platform.OS = 'web';
    stubWebCanvas('data:image/jpeg;base64,Y3JvcA==');

    const cropped = await cropImageToBase64('data:image/jpeg;base64,c3Jj', {
      originX: 0,
      originY: 0,
      width: 800,
      height: 600,
    });

    expect(cropped.uri).toBe('data:image/jpeg;base64,Y3JvcA==');
    expect(cropped.base64).toBe('Y3JvcA==');
    expect(cropped.mimeType).toBe('image/jpeg');
    expect(manipulateAsync).not.toHaveBeenCalled();
  });
});

describe('encodeImageToBase64', () => {
  beforeEach(() => {
    Platform.OS = 'ios';
    vi.mocked(manipulateAsync).mockReset();
    vi.unstubAllGlobals();
  });

  it('encodes the full photo on web when there is no crop frame', async () => {
    Platform.OS = 'web';
    stubWebCanvas('data:image/jpeg;base64,ZnVsbA==');

    const encoded = await encodeImageToBase64('blob:https://localhost/photo');
    expect(encoded.base64).toBe('ZnVsbA==');
    expect(encoded.mimeType).toBe('image/jpeg');
  });
});
