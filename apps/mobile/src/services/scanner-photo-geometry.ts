/** Crop rectangle in source-image pixel coordinates. */
export type ImageCropRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export type DisplayLayout = {
  displayWidth: number;
  displayHeight: number;
  offsetX: number;
  offsetY: number;
};

const MIN_CROP_EDGE_PX = 32;

/**
 * Layout of an image drawn with `resizeMode: 'contain'` inside a box.
 */
export function computeContainLayout(
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
): DisplayLayout {
  if (containerWidth <= 0 || containerHeight <= 0 || imageWidth <= 0 || imageHeight <= 0) {
    return { displayWidth: 0, displayHeight: 0, offsetX: 0, offsetY: 0 };
  }

  const containerRatio = containerWidth / containerHeight;
  const imageRatio = imageWidth / imageHeight;

  if (containerRatio > imageRatio) {
    const displayHeight = containerHeight;
    const displayWidth = displayHeight * imageRatio;
    return {
      displayWidth,
      displayHeight,
      offsetX: (containerWidth - displayWidth) / 2,
      offsetY: 0,
    };
  }

  const displayWidth = containerWidth;
  const displayHeight = displayWidth / imageRatio;
  return {
    displayWidth,
    displayHeight,
    offsetX: 0,
    offsetY: (containerHeight - displayHeight) / 2,
  };
}

/**
 * Maps a crop rectangle from container/display coordinates to image pixels.
 */
export function mapDisplayCropToImagePixels(params: {
  imageWidth: number;
  imageHeight: number;
  layout: DisplayLayout;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
}): ImageCropRect {
  const { imageWidth, imageHeight, layout } = params;
  if (layout.displayWidth <= 0 || layout.displayHeight <= 0) {
    return { originX: 0, originY: 0, width: imageWidth, height: imageHeight };
  }

  const scaleX = imageWidth / layout.displayWidth;
  const scaleY = imageHeight / layout.displayHeight;

  let originX = Math.round((params.cropX - layout.offsetX) * scaleX);
  let originY = Math.round((params.cropY - layout.offsetY) * scaleY);
  let width = Math.round(params.cropWidth * scaleX);
  let height = Math.round(params.cropHeight * scaleY);

  originX = clamp(originX, 0, Math.max(0, imageWidth - 1));
  originY = clamp(originY, 0, Math.max(0, imageHeight - 1));
  width = clamp(width, MIN_CROP_EDGE_PX, imageWidth - originX);
  height = clamp(height, MIN_CROP_EDGE_PX, imageHeight - originY);

  return { originX, originY, width, height };
}

export function initialCropInDisplay(
  layout: DisplayLayout,
  insetRatio = 0.08,
): { x: number; y: number; width: number; height: number } {
  const insetX = layout.displayWidth * insetRatio;
  const insetY = layout.displayHeight * insetRatio;
  return {
    x: layout.offsetX + insetX,
    y: layout.offsetY + insetY,
    width: Math.max(MIN_CROP_EDGE_PX, layout.displayWidth - insetX * 2),
    height: Math.max(MIN_CROP_EDGE_PX, layout.displayHeight - insetY * 2),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
