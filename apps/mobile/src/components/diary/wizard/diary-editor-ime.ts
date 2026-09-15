import { Keyboard, TextInput } from 'react-native';

type InputHandle = Parameters<typeof TextInput.State.blurTextInput>[0];

/**
 * Fold Gboard from a React Native Modal.
 * Nightly 34946086211: `Keyboard.dismiss()` alone left IME up (Modal window
 * token), so `diary-choice-Слабый` stayed in the tree under Gboard.
 * Blur the editor's last focused input first, then RN's focused input.
 */
export function blurDiaryEditorIme(registered: InputHandle | null | undefined) {
  if (registered) TextInput.State.blurTextInput(registered);
  const focused = TextInput.State.currentlyFocusedInput();
  if (focused && focused !== registered) TextInput.State.blurTextInput(focused);
  Keyboard.dismiss();
}
