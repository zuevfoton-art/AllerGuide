import { describe, expect, it } from 'vitest';
import {
  applyDisplayCropDrag,
  computeContainLayout,
  fullImageCropRect,
  initialCropInDisplay,
  mapDisplayCropToImagePixels,
  preferBitmapImageSize,
} from '@/src/services/scanner-photo-geometry';

describe('scanner-photo-geometry', () => {
  it('letterboxes horizontally for a tall image in a wide container', () => {
    const layout = computeContainLayout(400, 200, 100, 200);
    expect(layout.displayHeight).toBe(200);
    expect(layout.displayWidth).toBe(100);
    expect(layout.offsetX).toBe(150);
    expect(layout.offsetY).toBe(0);
  });

  it('letterboxes vertically for a wide image in a tall container', () => {
    const layout = computeContainLayout(200, 400, 200, 100);
    expect(layout.displayWidth).toBe(200);
    expect(layout.displayHeight).toBe(100);
    expect(layout.offsetX).toBe(0);
    expect(layout.offsetY).toBe(150);
  });

  it('maps display crop to image pixels with scale and clamp', () => {
    const layout = computeContainLayout(400, 400, 1000, 1000);
    const crop = initialCropInDisplay(layout, 0.1);
    const pixels = mapDisplayCropToImagePixels({
      imageWidth: 1000,
      imageHeight: 1000,
      layout,
      cropX: crop.x,
      cropY: crop.y,
      cropWidth: crop.width,
      cropHeight: crop.height,
    });

    expect(pixels.originX).toBeGreaterThanOrEqual(0);
    expect(pixels.originY).toBeGreaterThanOrEqual(0);
    expect(pixels.originX + pixels.width).toBeLessThanOrEqual(1000);
    expect(pixels.originY + pixels.height).toBeLessThanOrEqual(1000);
    expect(pixels.width).toBeGreaterThan(500);
    expect(pixels.height).toBeGreaterThan(500);
  });

  it('resizes from the bottom-right corner while anchoring top-left', () => {
    const bounds = computeContainLayout(400, 400, 400, 400);
    const start = { x: 100, y: 100, width: 120, height: 120 };
    const next = applyDisplayCropDrag({
      start,
      kind: 'br',
      dx: 40,
      dy: 20,
      bounds,
      minSize: 64,
    });
    expect(next).toEqual({ x: 100, y: 100, width: 160, height: 140 });
  });

  it('resizes from the top-left corner while anchoring bottom-right', () => {
    const bounds = computeContainLayout(400, 400, 400, 400);
    const start = { x: 100, y: 100, width: 120, height: 120 };
    const next = applyDisplayCropDrag({
      start,
      kind: 'tl',
      dx: 30,
      dy: 10,
      bounds,
      minSize: 64,
    });
    expect(next.x).toBe(130);
    expect(next.y).toBe(110);
    expect(next.width).toBe(90);
    expect(next.height).toBe(110);
    expect(next.x + next.width).toBe(220);
    expect(next.y + next.height).toBe(220);
  });

  it('keeps the larger bitmap when onLoad reports a downsampled decode', () => {
    expect(
      preferBitmapImageSize({ width: 4032, height: 3024 }, { width: 1080, height: 810 }),
    ).toEqual({ width: 4032, height: 3024 });
  });

  it('fills missing picker size from a later bitmap read', () => {
    expect(preferBitmapImageSize({ width: 0, height: 0 }, { width: 3024, height: 4032 })).toEqual({
      width: 3024,
      height: 4032,
    });
  });

  it('maps a full-frame display crop to the full bitmap, not a downsampled corner', () => {
    const bitmap = { width: 4000, height: 3000 };
    const layout = computeContainLayout(400, 300, bitmap.width, bitmap.height);
    const crop = initialCropInDisplay(layout, 0);
    const pixels = mapDisplayCropToImagePixels({
      imageWidth: bitmap.width,
      imageHeight: bitmap.height,
      layout,
      cropX: crop.x,
      cropY: crop.y,
      cropWidth: crop.width,
      cropHeight: crop.height,
    });

    expect(pixels.originX).toBe(0);
    expect(pixels.originY).toBe(0);
    expect(pixels.width).toBe(4000);
    expect(pixels.height).toBe(3000);
  });

  it('covers the whole bitmap when the crop frame is missing', () => {
    expect(fullImageCropRect(1600, 900)).toEqual({
      originX: 0,
      originY: 0,
      width: 1600,
      height: 900,
    });
  });

  it('enforces minimum size when shrinking a corner', () => {
    const bounds = computeContainLayout(400, 400, 400, 400);
    const start = { x: 100, y: 100, width: 120, height: 120 };
    const next = applyDisplayCropDrag({
      start,
      kind: 'br',
      dx: -200,
      dy: -200,
      bounds,
      minSize: 64,
    });
    expect(next.x).toBe(100);
    expect(next.y).toBe(100);
    expect(next.width).toBe(64);
    expect(next.height).toBe(64);
  });
});
