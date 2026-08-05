import { Platform } from 'react-native';
import { useKeyboardBottomInset } from '@/src/hooks/use-keyboard-bottom-inset';
import {
  resolveModalKeyboardAvoidance,
  type ModalKeyboardAvoidance,
} from '@/src/hooks/modal-keyboard-metrics';

export type { ModalKeyboardAvoidance } from '@/src/hooks/modal-keyboard-metrics';
export { resolveModalKeyboardAvoidance } from '@/src/hooks/modal-keyboard-metrics';

/**
 * Keyboard avoidance for React Native `Modal` surfaces.
 * Activity IME padding (MainActivity) does not apply inside Modal windows.
 */
export function useModalKeyboardAvoidance(): ModalKeyboardAvoidance {
  const keyboardInset = useKeyboardBottomInset();
  return resolveModalKeyboardAvoidance(Platform.OS, keyboardInset);
}
