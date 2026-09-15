import { Keyboard, Platform, TextInput } from 'react-native';

type InputHandle = Parameters<typeof TextInput.State.blurTextInput>[0];

type TextInputStateApi = {
  currentlyFocusedInput?: () => InputHandle | null;
  currentlyFocusedField?: () => InputHandle | null;
};

function readFocusedInput(): InputHandle | null | undefined {
  const state = TextInput.State as TextInputStateApi;
  if (typeof state.currentlyFocusedInput === 'function') {
    return state.currentlyFocusedInput();
  }
  // react-native-web still exposes currentlyFocusedField only.
  if (typeof state.currentlyFocusedField === 'function') {
    return state.currentlyFocusedField();
  }
  return null;
}

/**
 * Fold Gboard from a React Native Modal.
 * Nightly 34946086211: `Keyboard.dismiss()` alone left IME up (Modal window
 * token), so `diary-choice-Слабый` stayed in the tree under Gboard.
 * Blur the editor's last focused input first, then RN's focused input.
 * Web: `TextInput.State.currentlyFocusedInput` is missing — do not call it.
 */
export function blurDiaryEditorIme(registered: InputHandle | null | undefined) {
  if (registered) TextInput.State.blurTextInput(registered);
  const focused = readFocusedInput();
  if (focused && focused !== registered) TextInput.State.blurTextInput(focused);
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  }
  Keyboard.dismiss();
}
