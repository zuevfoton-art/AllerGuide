import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Bottom inset occupied by the software keyboard (0 when hidden).
 * Used where `adjustResize` / Modal windows do not shrink the layout
 * (common on Android API 35+ and inside RN `Modal`).
 */
export function useKeyboardBottomInset(): number {
  const [bottomInset, setBottomInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, (event) => {
      setBottomInset(event.endCoordinates.height);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setBottomInset(0);
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  return bottomInset;
}

/** KeyboardAvoidingView behavior that lifts chrome on both native platforms. */
export function resolveKeyboardAvoidingBehavior(): 'padding' | undefined {
  if (Platform.OS === 'web') return undefined;
  return 'padding';
}
