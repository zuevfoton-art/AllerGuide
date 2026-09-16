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
/**
 * Single-select rows small enough to pin above the editor scroll (itching,
 * 0–3 severity). Catalog grids stay in the scroll below the text field.
 */
export const COMPACT_DIARY_CHOICE_MAX_OPTIONS = 8;

type DiaryScreenStep = {
  field: string;
  multiSelect?: boolean;
  choices?: readonly string[];
};

export function isCompactDiaryChoice(step: DiaryScreenStep): boolean {
  return (
    step.field === 'choice' &&
    !step.multiSelect &&
    Array.isArray(step.choices) &&
    step.choices.length > 0 &&
    step.choices.length <= COMPACT_DIARY_CHOICE_MAX_OPTIONS
  );
}

export function isDiaryTextInputStep(step: DiaryScreenStep): boolean {
  return step.field === 'text';
}

/**
 * Pin compact choice chips into the sheet chrome (sibling of ScrollView).
 *
 * Nightly 35067465304: itching `diary-choice-Слабый` sat at
 * `[232,1925][428,2024]` under Gboard after fill; title tap left IME up
 * (Modal window token). Compact chips must stay in chrome.
 *
 * Nightly 35081306254 / 35094037122: pinning text fields into that chrome
 * too (`skinArea` + multiline `appearance` + chips, ~975px) put
 * `diary-field-appearance` at `[42,1558][1038,1873]` under Gboard. There
 * is no ScrollView in pinned-top, so `_fill-wizard-field` could not
 * `scrollUntilVisible` it. Keep text inputs in the scroll; chips stay
 * pinned when they share a screen with a text field.
 */
export function splitDiaryScreenForIme<T extends DiaryScreenStep>(
  steps: readonly T[],
): { pinnedSteps: T[]; scrolledSteps: T[] } {
  const hasTextInput = steps.some(isDiaryTextInputStep);
  const hasCompactChoice = steps.some(isCompactDiaryChoice);
  if (!hasTextInput || !hasCompactChoice) {
    return { pinnedSteps: [], scrolledSteps: [...steps] };
  }

  const pinnedSteps: T[] = [];
  const scrolledSteps: T[] = [];
  for (const step of steps) {
    if (isCompactDiaryChoice(step)) pinnedSteps.push(step);
    else scrolledSteps.push(step);
  }
  return { pinnedSteps, scrolledSteps };
}

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
