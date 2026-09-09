import { describe, expect, it } from 'vitest';
import {
  expandRect,
  firstResolvedHintStepIndex,
  isUsableAnchorRect,
  placeHintBubble,
  resolveHintFollowScroll,
  scrimRectsAroundHole,
  toLocalRect,
} from './hint-geometry';

const hole = { x: 100, y: 80, width: 40, height: 20 };
const viewport = { width: 360, height: 640 };

describe('isUsableAnchorRect', () => {
  it('rejects missing and zero-size rects', () => {
    expect(isUsableAnchorRect(undefined)).toBe(false);
    expect(isUsableAnchorRect({ x: 0, y: 0, width: 0, height: 10 })).toBe(false);
    expect(isUsableAnchorRect({ x: 1, y: 2, width: 3, height: 4 })).toBe(true);
  });
});

describe('expandRect / toLocalRect', () => {
  it('pads a hole and subtracts the overlay origin', () => {
    expect(expandRect(hole, 6)).toEqual({ x: 94, y: 74, width: 52, height: 32 });
    expect(toLocalRect(hole, { x: 10, y: 20 })).toEqual({ x: 90, y: 60, width: 40, height: 20 });
  });
});

describe('scrimRectsAroundHole', () => {
  it('covers the viewport without overlapping the hole', () => {
    const pieces = scrimRectsAroundHole(hole, viewport);
    expect(pieces.map((piece) => piece.key)).toEqual(['top', 'bottom', 'left', 'right']);

    for (const piece of pieces) {
      const overlapsX = piece.x < hole.x + hole.width && piece.x + piece.width > hole.x;
      const overlapsY = piece.y < hole.y + hole.height && piece.y + piece.height > hole.y;
      expect(overlapsX && overlapsY).toBe(false);
    }

    const covered = pieces.reduce((sum, piece) => sum + piece.width * piece.height, 0);
    expect(covered).toBe(viewport.width * viewport.height - hole.width * hole.height);
  });
});

describe('placeHintBubble', () => {
  it('places the bubble below when there is enough space', () => {
    const placement = placeHintBubble({
      hole,
      viewport,
      bubbleHeight: 140,
      horizontalPadding: 16,
    });
    expect(placement.placedBelow).toBe(true);
    expect(placement.top).toBeGreaterThan(hole.y + hole.height);
    expect(placement.left).toBeGreaterThanOrEqual(16);
    expect(placement.left + placement.width).toBeLessThanOrEqual(viewport.width - 16);
  });

  it('places the bubble above when the hole sits near the bottom', () => {
    const placement = placeHintBubble({
      hole: { x: 40, y: 560, width: 80, height: 40 },
      viewport,
      bubbleHeight: 140,
      horizontalPadding: 16,
    });
    expect(placement.placedBelow).toBe(false);
    expect(placement.top + 140).toBeLessThanOrEqual(560);
  });

  it('does not let a tall bubble overflow the viewport when minSpace would place it below', () => {
    const placement = placeHintBubble({
      hole: { x: 40, y: 420, width: 80, height: 40 },
      viewport,
      bubbleHeight: 220,
      horizontalPadding: 16,
    });
    expect(placement.placedBelow).toBe(false);
    expect(placement.top).toBeGreaterThanOrEqual(16);
    expect(placement.top + 220).toBeLessThanOrEqual(viewport.height - 16);
  });
});

describe('resolveHintFollowScroll', () => {
  it('scrolls a below-the-fold hole up so the bubble fits above it', () => {
    const result = resolveHintFollowScroll({
      hole: { x: 16, y: 900, width: 320, height: 100 },
      viewportHeight: 844,
      bubbleHeight: 180,
    });
    expect(result.deltaY).toBeGreaterThan(0);
    const newTop = 900 - result.deltaY;
    expect(newTop + 100).toBeLessThanOrEqual(844 - 16);
    expect(newTop - 12 - 180).toBeGreaterThanOrEqual(16);
  });

  it('does not scroll a tab-bar hole that already has room for the bubble above', () => {
    expect(
      resolveHintFollowScroll({
        hole: { x: 160, y: 760, width: 64, height: 56 },
        viewportHeight: 844,
        bubbleHeight: 180,
      }).deltaY,
    ).toBe(0);
  });

  it('scrolls when the bubble would hang off the bottom under the hole', () => {
    const result = resolveHintFollowScroll({
      hole: { x: 16, y: 700, width: 320, height: 180 },
      viewportHeight: 844,
      bubbleHeight: 180,
    });
    expect(result.deltaY).toBeGreaterThan(0);
    const newTop = 700 - result.deltaY;
    expect(newTop + 180).toBeLessThanOrEqual(844 - 16);
  });
});

describe('firstResolvedHintStepIndex', () => {
  it('skips steps whose anchors are missing or empty', () => {
    const steps = [{ anchorId: 'a' }, { anchorId: 'b' }, { anchorId: 'c' }];
    expect(firstResolvedHintStepIndex(steps, 0, {})).toBeNull();
    expect(
      firstResolvedHintStepIndex(steps, 0, {
        a: { x: 0, y: 0, width: 0, height: 0 },
        c: { x: 1, y: 1, width: 10, height: 10 },
      }),
    ).toBe(2);
  });
});
