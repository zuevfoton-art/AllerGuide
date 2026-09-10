export type ScreenKeyboardPadding = {
  extraKeyboardPad: number;
  /** Web: lift the whole screen above the IME. Native Android uses window insets. */
  rootPaddingBottom: number;
  scrollPaddingBottom: number;
  pinnedPaddingBottom: number;
};

/** Air between a sticky CTA and the IME (matches `space[2]`). */
export const KEYBOARD_CLEARANCE_PX = 8;

/**
 * Bottom padding for `Screen` while the software keyboard is open.
 *
 * iOS keeps `KeyboardAvoidingView` padding and must not add a second inset.
 * Android pads scroll content and sticky footers (API 35 often skips adjustResize).
 * Web pads the root so in-scroll CTAs and `pinnedBottom` both sit above the IME.
 */
export function resolveScreenKeyboardPadding(input: {
  platform: string;
  keyboardInset: number;
  layoutBottomPadding: number;
  safeBottom: number;
}): ScreenKeyboardPadding {
  const extraKeyboardPad = input.platform === 'ios' ? 0 : Math.max(0, input.keyboardInset);
  if (extraKeyboardPad <= 0) {
    return {
      extraKeyboardPad: 0,
      rootPaddingBottom: 0,
      scrollPaddingBottom: input.layoutBottomPadding,
      pinnedPaddingBottom: input.layoutBottomPadding,
    };
  }

  const aboveImePad = Math.max(input.safeBottom, extraKeyboardPad);
  if (input.platform === 'web') {
    const clearance = Math.max(input.safeBottom, KEYBOARD_CLEARANCE_PX);
    return {
      extraKeyboardPad,
      rootPaddingBottom: extraKeyboardPad,
      scrollPaddingBottom: clearance,
      pinnedPaddingBottom: clearance,
    };
  }

  return {
    extraKeyboardPad,
    rootPaddingBottom: 0,
    scrollPaddingBottom: aboveImePad,
    pinnedPaddingBottom: aboveImePad,
  };
}
