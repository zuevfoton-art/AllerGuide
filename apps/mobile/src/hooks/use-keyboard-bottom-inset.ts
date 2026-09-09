import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import {
  measureWebKeyboardOcclusion,
  readWebLayoutHeight,
} from '@/src/hooks/web-keyboard-metrics';

/**
 * Bottom inset occupied by the software keyboard (0 when hidden).
 * Used where `adjustResize` / Modal windows do not shrink the layout
 * (common on Android API 35+ and inside RN `Modal`).
 */
export function useKeyboardBottomInset(): number {
  const [bottomInset, setBottomInset] = useState(0);
  const closedLayoutHeightRef = useRef(0);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return undefined;
      const viewport = window.visualViewport;
      if (!viewport) return undefined;

      const readClientHeight = () => document.documentElement?.clientHeight ?? 0;

      const captureClosedLayout = () => {
        closedLayoutHeightRef.current = readWebLayoutHeight(
          window.innerHeight,
          readClientHeight(),
        );
      };
      if (closedLayoutHeightRef.current === 0) {
        captureClosedLayout();
      }

      const update = () => {
        const liveViewport = window.visualViewport;
        if (!liveViewport) {
          setBottomInset(0);
          return;
        }
        const innerHeight = window.innerHeight;
        const layoutHeight = readWebLayoutHeight(innerHeight, readClientHeight());
        const occluded = measureWebKeyboardOcclusion({
          innerHeight,
          layoutHeight,
          visualViewportHeight: liveViewport.height,
          visualViewportOffsetTop: liveViewport.offsetTop,
          closedLayoutHeight: closedLayoutHeightRef.current || layoutHeight,
        });
        if (occluded === 0) {
          captureClosedLayout();
        }
        setBottomInset(occluded);
      };

      update();
      viewport.addEventListener('resize', update);
      viewport.addEventListener('scroll', update);
      window.addEventListener('resize', update);
      return () => {
        viewport.removeEventListener('resize', update);
        viewport.removeEventListener('scroll', update);
        window.removeEventListener('resize', update);
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
