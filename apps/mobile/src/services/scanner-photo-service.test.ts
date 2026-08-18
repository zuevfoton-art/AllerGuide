import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Image } from 'react-native';
import { manipulateAsync } from 'expo-image-manipulator';
import { prepareScanPhotoForCrop } from '@/src/services/scanner-photo-service';

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

describe('prepareScanPhotoForCrop', () => {
  beforeEach(() => {
    vi.mocked(Image.getSize).mockReset();
    vi.mocked(manipulateAsync).mockReset();
  });

  it('uses Image.getSize when the picker left width/height empty', async () => {
    vi.mocked(Image.getSize).mockImplementation((_uri, success) => {
      success(3024, 4032);
    });

    const prepared = await prepareScanPhotoForCrop({
      uri: 'file://label.jpg',
      width: 0,
      height: 0,
    });

    expect(prepared).toEqual({ uri: 'file://label.jpg', width: 3024, height: 4032 });
    expect(manipulateAsync).not.toHaveBeenCalled();
  });

  it('re-encodes when picker and getSize disagree so crop uses manipulator pixels', async () => {
    vi.mocked(Image.getSize).mockImplementation((_uri, success) => {
      success(1080, 810);
    });
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
    vi.mocked(Image.getSize).mockImplementation((_uri, success) => {
      success(3024, 4032);
    });
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
});
