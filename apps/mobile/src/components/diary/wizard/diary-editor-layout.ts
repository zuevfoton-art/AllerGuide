/** Bottom-sheet diary editor: keep the scroll viewport inside the 88% sheet. */

export const DIARY_EDITOR_SHEET_MAX_RATIO = 0.88;
/** One step label + text field must keep a positive height when Gboard is open. */
export const DIARY_EDITOR_SCROLL_MIN_HEIGHT = 240;
/** Grabber + title row — matches `headerHeight` initial state in DiaryEditorModal. */
export const DIARY_EDITOR_HEADER_MIN_HEIGHT = 64;
/** One primary button row. Do not use crushed onLayout heights for IME padding. */
export const DIARY_EDITOR_FOOTER_MIN_HEIGHT = 56;
/** Matches `space[4]` — keep this file free of RN layout imports for Vitest. */
export const DIARY_EDITOR_SAFE_BOTTOM_MIN = 16;

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

/**
 * Bottom padding that lifts wizard chrome above Gboard.
 *
 * Nightly 34943266082: `keyboardInset` ≈ sheet inner height made
 * `paddingBottom` eat the header, so `diary-editor-title` left the
 * accessibility tree and `_dismiss-wizard-ime` could not tap it.
 * Cap padding so header + footer + min scroll still fit in the 88% sheet.
 */
export function diaryEditorSheetPaddingBottom(input: {
  windowHeight: number;
  headerHeight: number;
  footerHeight: number;
  keyboardInset: number;
  safeBottom: number;
}): number {
  const safe = Math.max(input.safeBottom, DIARY_EDITOR_SAFE_BOTTOM_MIN);
  const sheetMax = diaryEditorSheetMaxHeight(input.windowHeight);
  const reserved =
    Math.max(input.headerHeight, DIARY_EDITOR_HEADER_MIN_HEIGHT) +
    Math.max(input.footerHeight, DIARY_EDITOR_FOOTER_MIN_HEIGHT) +
    DIARY_EDITOR_SCROLL_MIN_HEIGHT;
  const maxPad = Math.max(safe, sheetMax - reserved);
  return Math.min(safe + Math.max(0, input.keyboardInset), maxPad);
}
