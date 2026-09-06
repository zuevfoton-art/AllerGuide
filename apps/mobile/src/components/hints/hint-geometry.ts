import { space } from '@/src/constants/layout';

export const HINT_HOLE_PADDING = 6;
export const HINT_BUBBLE_MIN_SPACE = 160;
export const HINT_ANCHOR_WAIT_MS = 600;
export const HINT_SCRIM_OPACITY = 0.6;

export type HintRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HintScrimPiece = HintRect & { key: 'top' | 'bottom' | 'left' | 'right' };

export function isUsableAnchorRect(rect: HintRect | undefined): rect is HintRect {
  return Boolean(rect && rect.width > 0 && rect.height > 0);
}

export function expandRect(rect: HintRect, padding: number): HintRect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

export function toLocalRect(rect: HintRect, origin: { x: number; y: number }): HintRect {
  return {
    x: rect.x - origin.x,
    y: rect.y - origin.y,
    width: rect.width,
    height: rect.height,
  };
}

export function scrimRectsAroundHole(
  hole: HintRect,
  viewport: { width: number; height: number },
): HintScrimPiece[] {
  const left = Math.max(0, hole.x);
  const top = Math.max(0, hole.y);
  const right = Math.min(viewport.width, hole.x + hole.width);
  const bottom = Math.min(viewport.height, hole.y + hole.height);
  const holeWidth = Math.max(0, right - left);
  const holeHeight = Math.max(0, bottom - top);

  const pieces: HintScrimPiece[] = [
    { key: 'top', x: 0, y: 0, width: viewport.width, height: top },
    {
      key: 'bottom',
      x: 0,
      y: bottom,
      width: viewport.width,
      height: Math.max(0, viewport.height - bottom),
    },
    { key: 'left', x: 0, y: top, width: left, height: holeHeight },
    {
      key: 'right',
      x: right,
      y: top,
      width: Math.max(0, viewport.width - right),
      height: holeHeight,
    },
  ];

  return pieces.filter((piece) => piece.width > 0 && piece.height > 0);
}

export function placeHintBubble(args: {
  hole: HintRect;
  viewport: { width: number; height: number };
  bubbleHeight: number;
  horizontalPadding: number;
  contentMaxWidth?: number;
  minSpace?: number;
}): { top: number; left: number; width: number; placedBelow: boolean } {
  const minSpace = args.minSpace ?? HINT_BUBBLE_MIN_SPACE;
  const availableWidth = Math.max(0, args.viewport.width - args.horizontalPadding * 2);
  const width = Math.min(args.contentMaxWidth ?? availableWidth, availableWidth);
  const centeredLeft = args.hole.x + args.hole.width / 2 - width / 2;
  const maxLeft = args.viewport.width - args.horizontalPadding - width;
  const left = Math.max(args.horizontalPadding, Math.min(centeredLeft, maxLeft));

  const spaceBelow = args.viewport.height - (args.hole.y + args.hole.height);
  const placedBelow = spaceBelow >= minSpace;
  const gap = space[3];
  const rawTop = placedBelow
    ? args.hole.y + args.hole.height + gap
    : args.hole.y - args.bubbleHeight - gap;

  return {
    top: Math.max(args.horizontalPadding, rawTop),
    left,
    width,
    placedBelow,
  };
}

export function firstResolvedHintStepIndex(
  steps: readonly { anchorId: string }[],
  startIndex: number,
  anchors: Record<string, HintRect | undefined>,
): number | null {
  for (let index = startIndex; index < steps.length; index += 1) {
    if (isUsableAnchorRect(anchors[steps[index]?.anchorId])) return index;
  }
  return null;
}
