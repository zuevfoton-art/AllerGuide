import { Keyboard, TextInput } from 'react-native';

/**
 * Fold Gboard *and* blur the focused field.
 * `Keyboard.dismiss()` alone leaves the TextInput focused on Android, so the
 * next Maestro `inputText` still types into skinArea (`лицоyyпокраснение`,
 * nightly 34451477109).
 */
export function dismissDiaryKeyboard(): void {
  const focused = TextInput.State.currentlyFocusedInput();
  if (focused) {
    TextInput.State.blurTextInput(focused);
  }
  Keyboard.dismiss();
}
