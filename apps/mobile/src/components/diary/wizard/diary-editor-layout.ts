/** Bottom-sheet diary editor: keep the scroll viewport inside the 88% sheet. */

export const DIARY_EDITOR_SHEET_MAX_RATIO = 0.88;
/** One step label + text field must keep a positive height when Gboard is open. */
export const DIARY_EDITOR_SCROLL_MIN_HEIGHT = 240;
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

/**
 * Pin compact choice chips in the sheet chrome when they share a screen with
 * text fields. Nightly 35067465304: itching `diary-choice-Слабый` sat at
 * `[232,1925][428,2024]` under Gboard after fill; title tap left IME up
 * (Modal window token) and `extendedWaitUntil visible` failed for 15s.
 */
export function splitDiaryScreenForIme<T extends DiaryScreenStep>(
  steps: readonly T[],
): { pinnedSteps: T[]; scrolledSteps: T[] } {
  const pinnedSteps: T[] = [];
  const scrolledSteps: T[] = [];
  for (const step of steps) {
    if (isCompactDiaryChoice(step)) pinnedSteps.push(step);
    else scrolledSteps.push(step);
  }
  if (pinnedSteps.length === 0 || scrolledSteps.length === 0) {
    return { pinnedSteps: [], scrolledSteps: [...steps] };
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
