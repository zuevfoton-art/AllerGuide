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
    const registered = { id: 'appearance' };
    blurDiaryEditorIme(registered as never);

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
    blurDiaryEditorIme(registered as never);

    expect(blurTextInput.mock.calls).toEqual([[registered], [focused]]);
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
