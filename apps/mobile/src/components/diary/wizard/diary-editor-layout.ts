/** Bottom-sheet diary editor: keep the scroll viewport inside the 88% sheet. */

export const DIARY_EDITOR_SHEET_MAX_RATIO = 0.88;
/** One step label + text field must keep a positive height when Gboard is open. */
export const DIARY_EDITOR_SCROLL_MIN_HEIGHT = 240;

export function diaryEditorSheetMaxHeight(windowHeight: number): number {
  return Math.round(windowHeight * DIARY_EDITOR_SHEET_MAX_RATIO);
}

/**
 * Pixel cap for the editor ScrollView. A `flexGrow: 0` scroll view inside a
 * `maxHeight: 88%` sheet grows with content, then `overflow: hidden` crushes
 * `diary-wizard-primary` (nightly 34325395361: bounds [87,2373][993,2358]).
 */
export function diaryEditorScrollMaxHeight(input: {
  windowHeight: number;
  headerHeight: number;
  footerHeight: number;
  sheetPaddingBottom: number;
}): number {
  const sheetMax = diaryEditorSheetMaxHeight(input.windowHeight);
  return Math.max(
    DIARY_EDITOR_SCROLL_MIN_HEIGHT,
    sheetMax - input.headerHeight - input.footerHeight - input.sheetPaddingBottom,
  );
}
