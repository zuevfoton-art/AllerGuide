import { describe, expect, it } from 'vitest';
import { resolveScreenKeyboardPadding } from './screen-keyboard-metrics';

describe('resolveScreenKeyboardPadding', () => {
  it('leaves iOS to KeyboardAvoidingView even when an inset is reported', () => {
    expect(
      resolveScreenKeyboardPadding({
        platform: 'ios',
        keyboardInset: 320,
        layoutBottomPadding: 90,
        safeBottom: 34,
      }),
    ).toEqual({
      extraKeyboardPad: 0,
      rootPaddingBottom: 0,
      scrollPaddingBottom: 90,
      pinnedPaddingBottom: 90,
    });
  });

  it('pads Android scroll content and sticky footers without lifting the root', () => {
    expect(
      resolveScreenKeyboardPadding({
        platform: 'android',
        keyboardInset: 320,
        layoutBottomPadding: 90,
        safeBottom: 24,
      }),
    ).toEqual({
      extraKeyboardPad: 320,
      rootPaddingBottom: 0,
      scrollPaddingBottom: 320,
      pinnedPaddingBottom: 320,
    });
  });

  it('lifts the whole web screen so in-scroll CTAs are not under the IME', () => {
    expect(
      resolveScreenKeyboardPadding({
        platform: 'web',
        keyboardInset: 280,
        layoutBottomPadding: 92,
        safeBottom: 0,
      }),
    ).toEqual({
      extraKeyboardPad: 280,
      rootPaddingBottom: 280,
      scrollPaddingBottom: 0,
      pinnedPaddingBottom: 0,
    });
  });

  it('keeps layout padding when the keyboard is hidden', () => {
    expect(
      resolveScreenKeyboardPadding({
        platform: 'android',
        keyboardInset: 0,
        layoutBottomPadding: 90,
        safeBottom: 24,
      }),
    ).toEqual({
      extraKeyboardPad: 0,
      rootPaddingBottom: 0,
      scrollPaddingBottom: 90,
      pinnedPaddingBottom: 90,
    });
  });

  it('does not stack tab-bar padding on top of the Android IME inset', () => {
    const result = resolveScreenKeyboardPadding({
      platform: 'android',
      keyboardInset: 300,
      layoutBottomPadding: 90,
      safeBottom: 20,
    });
    expect(result.scrollPaddingBottom).toBe(300);
    expect(result.scrollPaddingBottom).not.toBe(390);
  });
});
