import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  useModalKeyboardAvoidance,
  type ModalKeyboardAvoidance,
} from '@/src/hooks/use-modal-keyboard-avoidance';

type ModalKeyboardAvoidProps = {
  style?: StyleProp<ViewStyle>;
  children: ReactNode | ((api: ModalKeyboardAvoidance) => ReactNode);
};

/**
 * Wraps Modal content so TextInputs stay above the software keyboard.
 * Prefer `liftStyle` on bottom sheets / cards; `insetStyle` on full-screen bodies.
 */
export function ModalKeyboardAvoid({ style, children }: ModalKeyboardAvoidProps) {
  const api = useModalKeyboardAvoidance();

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={api.behavior}
      keyboardVerticalOffset={0}>
      {typeof children === 'function' ? children(api) : children}
    </KeyboardAvoidingView>
  );
}
