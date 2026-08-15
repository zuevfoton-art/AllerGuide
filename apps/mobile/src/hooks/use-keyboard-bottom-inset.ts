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
    if (Platform.OS === 'web') {
      const viewport = typeof window !== 'undefined' ? window.visualViewport : null;
      if (!viewport) return undefined;
      const update = () => {
        const occluded = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
        setBottomInset(occluded);
      };
      update();
      viewport.addEventListener('resize', update);
      viewport.addEventListener('scroll', update);
      return () => {
        viewport.removeEventListener('resize', update);
        viewport.removeEventListener('scroll', update);
      };
    }

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
