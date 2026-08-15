import { describe, expect, it } from 'vitest';
import {
  formatDishVisionIngredientList,
  resolveDishVisionPhotoUri,
} from './scanner-dish-vision-display';

describe('scanner-dish-vision-display', () => {
  it('prefers the cropped file URI over a data URL', () => {
    expect(
      resolveDishVisionPhotoUri({
        fileUri: 'file:///tmp/crop.jpg',
        base64: 'abc',
        mimeType: 'image/jpeg',
      }),
    ).toBe('file:///tmp/crop.jpg');
  });

  it('builds a data URI when only base64 is available', () => {
    expect(
      resolveDishVisionPhotoUri({
        base64: 'abc123',
        mimeType: 'image/png',
      }),
    ).toBe('data:image/png;base64,abc123');
  });

  it('returns null when no snapshot exists', () => {
    expect(resolveDishVisionPhotoUri({})).toBeNull();
  });

  it('joins trimmed ingredients for the result card', () => {
    expect(formatDishVisionIngredientList(['  тесто ', '', 'моцарелла'])).toBe(
      'тесто, моцарелла',
    );
  });
});
