import { describe, expect, it } from 'vitest';
import {
  DIARY_EDITOR_FOOTER_MIN_HEIGHT,
  DIARY_EDITOR_HEADER_MIN_HEIGHT,
  DIARY_EDITOR_SAFE_BOTTOM_MIN,
  DIARY_EDITOR_SCROLL_MIN_HEIGHT,
  diaryEditorScrollMaxHeight,
  diaryEditorSheetMaxHeight,
  diaryEditorSheetPaddingBottom,
} from './diary-editor-layout';

describe('diaryEditorScrollMaxHeight', () => {
  it('leaves room for header, footer, and sheet padding on a Pixel-sized window', () => {
    const windowHeight = 2400;
    const headerHeight = 80;
    const footerHeight = 96;
    const sheetPaddingBottom = 16;
    const scrollMax = diaryEditorScrollMaxHeight({
      windowHeight,
      headerHeight,
      footerHeight,
      sheetPaddingBottom,
    });

    expect(diaryEditorSheetMaxHeight(windowHeight)).toBe(2112);
    expect(scrollMax).toBe(2112 - 80 - 96 - 16);
    expect(scrollMax).toBeGreaterThan(DIARY_EDITOR_SCROLL_MIN_HEIGHT);
    expect(headerHeight + footerHeight + sheetPaddingBottom + scrollMax).toBe(2112);
  });

  it('still leaves room after pinning the step label above the ScrollView', () => {
    const windowHeight = 2400;
    const headerHeight = 64 + 72;
    const footerHeight = 143;
    const sheetPaddingBottom = 16;
    const scrollMax = diaryEditorScrollMaxHeight({
      windowHeight,
      headerHeight,
      footerHeight,
      sheetPaddingBottom,
    });

    expect(scrollMax).toBeGreaterThan(DIARY_EDITOR_SCROLL_MIN_HEIGHT);
    expect(headerHeight + footerHeight + sheetPaddingBottom + scrollMax).toBe(
      diaryEditorSheetMaxHeight(windowHeight),
    );
  });

  it('does not shrink the scroll viewport below the minimum', () => {
    expect(
      diaryEditorScrollMaxHeight({
        windowHeight: 200,
        headerHeight: 80,
        footerHeight: 80,
        sheetPaddingBottom: 40,
      }),
    ).toBe(DIARY_EDITOR_SCROLL_MIN_HEIGHT);
    expect(DIARY_EDITOR_SCROLL_MIN_HEIGHT).toBeGreaterThanOrEqual(240);
  });
});

describe('diaryEditorSheetPaddingBottom', () => {
  const pixel = {
    windowHeight: 2400,
    headerHeight: 64,
    footerHeight: 96,
    safeBottom: 0,
  };

  it('adds the keyboard inset when chrome still fits in the 88% sheet', () => {
    expect(
      diaryEditorSheetPaddingBottom({ ...pixel, keyboardInset: 320 }),
    ).toBe(DIARY_EDITOR_SAFE_BOTTOM_MIN + 320);
  });

  it('caps padding so header, footer, and min scroll stay in the sheet', () => {
    const pad = diaryEditorSheetPaddingBottom({ ...pixel, keyboardInset: 2000 });
    const sheetMax = diaryEditorSheetMaxHeight(pixel.windowHeight);
    const reserved =
      DIARY_EDITOR_HEADER_MIN_HEIGHT +
      Math.max(pixel.footerHeight, DIARY_EDITOR_FOOTER_MIN_HEIGHT) +
      DIARY_EDITOR_SCROLL_MIN_HEIGHT;
    expect(pad).toBe(sheetMax - reserved);
    expect(sheetMax - pad).toBe(reserved);
  });

  it('does not use crushed onLayout heights to grow IME padding', () => {
    const crushed = diaryEditorSheetPaddingBottom({
      windowHeight: 2400,
      headerHeight: 10,
      footerHeight: 8,
      keyboardInset: 2000,
      safeBottom: 0,
    });
    const reserved =
      DIARY_EDITOR_HEADER_MIN_HEIGHT +
      DIARY_EDITOR_FOOTER_MIN_HEIGHT +
      DIARY_EDITOR_SCROLL_MIN_HEIGHT;
    expect(diaryEditorSheetMaxHeight(2400) - crushed).toBe(reserved);
  });
});
