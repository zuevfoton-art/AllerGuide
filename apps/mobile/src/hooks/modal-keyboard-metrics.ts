import type { ViewStyle } from 'react-native';

export type ModalKeyboardAvoidance = {
  /** iOS KeyboardAvoidingView behavior; Android relies on lift/inset styles. */
  behavior: 'padding' | undefined;
  /** Lift bottom sheets / centered cards above the IME (Android Modal windows). */
  liftStyle: Pick<ViewStyle, 'marginBottom'> | undefined;
  /** Shrink full-screen modal bodies from the bottom (Android). */
  insetStyle: Pick<ViewStyle, 'paddingBottom'> | undefined;
  keyboardInset: number;
};

/** Pure resolver — kept free of RN runtime imports for Vitest. */
export function resolveModalKeyboardAvoidance(
  platform: string,
  keyboardInset: number,
): ModalKeyboardAvoidance {
  const liftInset = (platform === 'android' || platform === 'web') && keyboardInset > 0;

  return {
    behavior: platform === 'ios' ? 'padding' : undefined,
    liftStyle: liftInset ? { marginBottom: keyboardInset } : undefined,
    insetStyle: liftInset ? { paddingBottom: keyboardInset } : undefined,
    keyboardInset,
  };
}
