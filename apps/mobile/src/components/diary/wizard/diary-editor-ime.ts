import { Keyboard, Platform, TextInput } from 'react-native';

type InputHandle = Parameters<typeof TextInput.State.blurTextInput>[0];

type TextInputStateApi = {
  currentlyFocusedInput?: () => InputHandle | null;
  currentlyFocusedField?: () => InputHandle | null;
};

type BlurCapableHandle = { blur?: () => void };

function blurHandle(handle: InputHandle | null | undefined) {
  if (handle == null) return;
  const capable = handle as BlurCapableHandle;
  if (typeof capable.blur === 'function') capable.blur();
  TextInput.State.blurTextInput(handle);
}

function readFocusedInput(): InputHandle | null | undefined {
  const state = TextInput.State as unknown as TextInputStateApi;
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
 * Call the host `.blur()` (Modal window token) then `TextInput.State`.
 * Nightly 34956812041: Maestro `inputText` never fires RN `onFocus`, so a
 * single "last focused" ref was null. Blur every mounted editor input.
 * Web: `TextInput.State.currentlyFocusedInput` is missing — do not call it.
 * Nightly 35067465304: keep blurring registered fields — clearing the ref
 * after a no-op `Keyboard.dismiss()` left Gboard up for the choice tap.
 */
export function blurDiaryEditorIme(
  registered: readonly (InputHandle | null | undefined)[] = [],
) {
  for (const node of registered) {
    blurHandle(node);
  }
  const focused = readFocusedInput();
  if (focused && !registered.includes(focused)) blurHandle(focused);
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  }
  Keyboard.dismiss();
}
