import { describe, expect, it } from 'vitest';
import { getDiarySection, groupDiaryStepsIntoScreens } from '@allerguide/core';
import {
  COMPACT_DIARY_CHOICE_MAX_OPTIONS,
  DIARY_EDITOR_FOOTER_MIN_HEIGHT,
  DIARY_EDITOR_HEADER_MIN_HEIGHT,
  DIARY_EDITOR_SAFE_BOTTOM_MIN,
  DIARY_EDITOR_SCROLL_MIN_HEIGHT,
  diaryEditorScrollMaxHeight,
  diaryEditorSheetMaxHeight,
  diaryEditorSheetPaddingBottom,
  isDiaryTextInputStep,
  isCompactDiaryTextIme,
  pinnedStepsVisibleForIme,
  splitDiaryScreenForIme,
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

describe('splitDiaryScreenForIme', () => {
  const itching = {
    id: 'itching',
    field: 'choice' as const,
    choices: ['Нет', 'Слабый', 'Умеренный', 'Сильный'],
  };
  const appearance = { id: 'appearance', field: 'text' as const };
  const skinArea = { id: 'skinArea', field: 'text' as const };
  const catalog = {
    id: 'symptomCode',
    field: 'choice' as const,
    multiSelect: true,
    choices: Array.from({ length: COMPACT_DIARY_CHOICE_MAX_OPTIONS + 10 }, (_, i) => `s${i}`),
  };

  it('pins skin text fields and itching chips in schema order', () => {
    expect(splitDiaryScreenForIme([skinArea, appearance, itching])).toEqual({
      pinnedSteps: [skinArea, appearance, itching],
      scrolledSteps: [],
    });
  });

  it('leaves a choice-only screen in the scroll (no IME from a text field)', () => {
    expect(splitDiaryScreenForIme([itching])).toEqual({
      pinnedSteps: [],
      scrolledSteps: [itching],
    });
  });

  it('keeps multi-select symptom catalogs below the required text field', () => {
    const symptoms = { id: 'symptoms', field: 'text' as const };
    expect(splitDiaryScreenForIme([symptoms, catalog])).toEqual({
      pinnedSteps: [],
      scrolledSteps: [symptoms, catalog],
    });
  });

  it('pins the real skin grouped screen in schema order with an empty scroll', () => {
    const screen = groupDiaryStepsIntoScreens(getDiarySection('Кожа')?.steps ?? [])[0] ?? [];
    const split = splitDiaryScreenForIme(screen);
    expect(split.pinnedSteps.map((step) => step.id)).toEqual([
      'skinArea',
      'appearance',
      'itching',
    ]);
    expect(split.scrolledSteps.map((step) => step.id)).toEqual([]);
    expect(screen.filter(isDiaryTextInputStep).map((step) => step.id)).toEqual([
      'skinArea',
      'appearance',
    ]);
  });

  it('keeps only the focused pinned text field while IME is open', () => {
    const pinned = [skinArea, appearance, itching];
    expect(pinnedStepsVisibleForIme(pinned, null).map((step) => step.id)).toEqual([
      'skinArea',
      'appearance',
      'itching',
    ]);
    expect(pinnedStepsVisibleForIme(pinned, 'appearance').map((step) => step.id)).toEqual([
      'appearance',
    ]);
    expect(isCompactDiaryTextIme(pinnedStepsVisibleForIme(pinned, 'appearance'))).toBe(true);
    expect(pinnedStepsVisibleForIme(pinned, 'skinArea').map((step) => step.id)).toEqual([
      'skinArea',
      'appearance',
      'itching',
    ]);
    expect(isCompactDiaryTextIme(pinnedStepsVisibleForIme(pinned, 'skinArea'))).toBe(false);
    expect(pinnedStepsVisibleForIme(pinned, 'itching').map((step) => step.id)).toEqual([
      'skinArea',
      'appearance',
      'itching',
    ]);
    expect(isCompactDiaryTextIme(pinned)).toBe(false);
  });

  it('pins two medicine text fields and leaves the time picker in the scroll', () => {
    const medicine = { id: 'medicine', field: 'text' as const };
    const dosage = { id: 'dosage', field: 'text' as const };
    const takenAt = { id: 'takenAt', field: 'time' as const };
    expect(splitDiaryScreenForIme([medicine, dosage, takenAt])).toEqual({
      pinnedSteps: [medicine, dosage],
      scrolledSteps: [takenAt],
    });
  });

  it('still leaves room for Gboard padding after pinning the skin chrome', () => {
    const pad = diaryEditorSheetPaddingBottom({
      windowHeight: 2400,
      headerHeight: 64 + 400,
      footerHeight: 143,
      keyboardInset: 900,
      safeBottom: 0,
    });
    expect(pad).toBe(DIARY_EDITOR_SAFE_BOTTOM_MIN + 900);
    expect(
      diaryEditorSheetMaxHeight(2400) - pad - (64 + 400) - 143,
    ).toBeGreaterThanOrEqual(DIARY_EDITOR_SCROLL_MIN_HEIGHT);
  });
});
