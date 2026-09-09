/** Ignore URL-bar / sub-pixel jitter that is not a software keyboard. */
export const KEYBOARD_OCCLUSION_EPSILON_PX = 8;

export type WebKeyboardViewport = {
  innerHeight: number;
  /** Layout viewport (`documentElement.clientHeight`), often a static 100vh. */
  layoutHeight: number;
  visualViewportHeight: number;
  visualViewportOffsetTop: number;
  /** Last layout height while the keyboard was closed. */
  closedLayoutHeight: number;
};

/**
 * Bottom inset covered by the software keyboard on web.
 *
 * Chrome/Android often shrinks `innerHeight` with the IME, so
 * `innerHeight - visualViewport.height` is 0 even though a 100vh RN root
 * still sits under the keyboard. Fall back to the closed-layout baseline.
 */
export function measureWebKeyboardOcclusion(viewport: WebKeyboardViewport): number {
  const visualBottom = viewport.visualViewportHeight + viewport.visualViewportOffsetTop;
  const overlayOccluded = Math.max(0, viewport.innerHeight - visualBottom);
  const layoutOccluded = Math.max(0, viewport.layoutHeight - visualBottom);
  const closedOccluded = Math.max(0, viewport.closedLayoutHeight - visualBottom);
  const occluded = Math.max(overlayOccluded, layoutOccluded, closedOccluded);
  return occluded < KEYBOARD_OCCLUSION_EPSILON_PX ? 0 : occluded;
}

export function readWebLayoutHeight(
  innerHeight: number,
  clientHeight: number | null | undefined,
): number {
  return Math.max(innerHeight, clientHeight ?? 0);
}
