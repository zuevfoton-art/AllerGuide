import { describe, expect, it } from 'vitest';
import {
  DIARY_EDITOR_SCROLL_MIN_HEIGHT,
  diaryEditorScrollMaxHeight,
  diaryEditorSheetMaxHeight,
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
