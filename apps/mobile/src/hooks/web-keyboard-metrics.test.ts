import { describe, expect, it } from 'vitest';
import {
  KEYBOARD_OCCLUSION_EPSILON_PX,
  measureWebKeyboardOcclusion,
  readWebLayoutHeight,
} from './web-keyboard-metrics';

describe('measureWebKeyboardOcclusion', () => {
  it('measures overlay IME when innerHeight stays large', () => {
    expect(
      measureWebKeyboardOcclusion({
        innerHeight: 800,
        layoutHeight: 800,
        visualViewportHeight: 500,
        visualViewportOffsetTop: 0,
        closedLayoutHeight: 800,
      }),
    ).toBe(300);
  });

  it('uses the closed-layout baseline when innerHeight already shrank', () => {
    expect(
      measureWebKeyboardOcclusion({
        innerHeight: 500,
        layoutHeight: 500,
        visualViewportHeight: 500,
        visualViewportOffsetTop: 0,
        closedLayoutHeight: 800,
      }),
    ).toBe(300);
  });

  it('uses a static 100vh layout height when the visual viewport shrinks', () => {
    expect(
      measureWebKeyboardOcclusion({
        innerHeight: 500,
        layoutHeight: 800,
        visualViewportHeight: 500,
        visualViewportOffsetTop: 0,
        closedLayoutHeight: 500,
      }),
    ).toBe(300);
  });

  it('includes visualViewport offsetTop (iOS Safari toolbar / pinch)', () => {
    expect(
      measureWebKeyboardOcclusion({
        innerHeight: 800,
        layoutHeight: 800,
        visualViewportHeight: 500,
        visualViewportOffsetTop: 40,
        closedLayoutHeight: 800,
      }),
    ).toBe(260);
  });

  it('returns 0 when the keyboard is closed', () => {
    expect(
      measureWebKeyboardOcclusion({
        innerHeight: 800,
        layoutHeight: 800,
        visualViewportHeight: 800,
        visualViewportOffsetTop: 0,
        closedLayoutHeight: 800,
      }),
    ).toBe(0);
  });

  it('ignores URL-bar jitter below the occlusion epsilon', () => {
    expect(
      measureWebKeyboardOcclusion({
        innerHeight: 800,
        layoutHeight: 800,
        visualViewportHeight: 800 - (KEYBOARD_OCCLUSION_EPSILON_PX - 1),
        visualViewportOffsetTop: 0,
        closedLayoutHeight: 800,
      }),
    ).toBe(0);
  });
});

describe('readWebLayoutHeight', () => {
  it('prefers the larger of innerHeight and clientHeight', () => {
    expect(readWebLayoutHeight(500, 800)).toBe(800);
    expect(readWebLayoutHeight(800, 500)).toBe(800);
    expect(readWebLayoutHeight(800, null)).toBe(800);
  });
});
