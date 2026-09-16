import { describe, expect, it } from 'vitest';
import { getDiarySection, groupDiaryStepsIntoScreens } from '@allerguide/core';
import {
  COMPACT_DIARY_CHOICE_MAX_OPTIONS,
  DIARY_EDITOR_SCROLL_MIN_HEIGHT,
  diaryEditorScrollMaxHeight,
  diaryEditorSheetMaxHeight,
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

  it('pins compact itching chips when they share a screen with text fields', () => {
    expect(splitDiaryScreenForIme([skinArea, appearance, itching])).toEqual({
      pinnedSteps: [itching],
      scrolledSteps: [skinArea, appearance],
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

  it('pins itching on the real skin grouped screen', () => {
    const screen = groupDiaryStepsIntoScreens(getDiarySection('Кожа')?.steps ?? [])[0] ?? [];
    const split = splitDiaryScreenForIme(screen);
    expect(split.pinnedSteps.map((step) => step.id)).toEqual(['itching']);
    expect(split.scrolledSteps.map((step) => step.id)).toEqual(['skinArea', 'appearance']);
  });
});
