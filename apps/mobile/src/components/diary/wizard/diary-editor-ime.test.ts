import { afterEach, describe, expect, it, vi } from 'vitest';

describe('blurDiaryEditorIme', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('react-native');
  });

  it('blurs the registered Modal input before Keyboard.dismiss', async () => {
    const blurTextInput = vi.fn();
    const currentlyFocusedInput = vi.fn(() => null);
    const dismiss = vi.fn();
    vi.doMock('react-native', () => ({
      Platform: { OS: 'android' },
      Keyboard: { dismiss },
      TextInput: { State: { blurTextInput, currentlyFocusedInput } },
    }));

    const { blurDiaryEditorIme } = await import('./diary-editor-ime');
    const blur = vi.fn();
    const registered = { id: 'appearance', blur };
    blurDiaryEditorIme([registered as never]);

    expect(blur).toHaveBeenCalledTimes(1);
    expect(blurTextInput).toHaveBeenCalledWith(registered);
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('also blurs RN currentlyFocusedInput when it differs from the registered field', async () => {
    const blurTextInput = vi.fn();
    const focused = { id: 'focused' };
    const currentlyFocusedInput = vi.fn(() => focused);
    const dismiss = vi.fn();
    vi.doMock('react-native', () => ({
      Platform: { OS: 'android' },
      Keyboard: { dismiss },
      TextInput: { State: { blurTextInput, currentlyFocusedInput } },
    }));

    const { blurDiaryEditorIme } = await import('./diary-editor-ime');
    const registered = { id: 'registered' };
    blurDiaryEditorIme([registered as never]);

    expect(blurTextInput.mock.calls).toEqual([[registered], [focused]]);
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('uses currentlyFocusedField on web when currentlyFocusedInput is missing', async () => {
    const blurTextInput = vi.fn();
    const focused = { id: 'web-field' };
    const currentlyFocusedField = vi.fn(() => focused);
    const dismiss = vi.fn();
    vi.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      Keyboard: { dismiss },
      TextInput: { State: { blurTextInput, currentlyFocusedField } },
    }));

    const { blurDiaryEditorIme } = await import('./diary-editor-ime');
    blurDiaryEditorIme([]);

    expect(currentlyFocusedField).toHaveBeenCalledTimes(1);
    expect(blurTextInput).toHaveBeenCalledWith(focused);
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('blurs every mounted editor input (Maestro inputText skips RN onFocus)', async () => {
    const blurTextInput = vi.fn();
    const currentlyFocusedInput = vi.fn(() => null);
    const dismiss = vi.fn();
    vi.doMock('react-native', () => ({
      Platform: { OS: 'android' },
      Keyboard: { dismiss },
      TextInput: { State: { blurTextInput, currentlyFocusedInput } },
    }));

    const { blurDiaryEditorIme } = await import('./diary-editor-ime');
    const firstBlur = vi.fn();
    const secondBlur = vi.fn();
    const first = { id: 'skinArea', blur: firstBlur };
    const second = { id: 'appearance', blur: secondBlur };
    blurDiaryEditorIme([first, second] as never[]);

    expect(firstBlur).toHaveBeenCalledTimes(1);
    expect(secondBlur).toHaveBeenCalledTimes(1);
    expect(blurTextInput.mock.calls).toEqual([[first], [second]]);
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
