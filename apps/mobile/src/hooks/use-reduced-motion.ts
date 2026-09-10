import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useAppearanceStore } from '@/src/store/appearance-store';

/** System reduce-motion OR the in-app “calm animations” setting. */
export function useReducedMotion(): boolean {
  const preferCalm = useAppearanceStore((s) => s.preferCalmMotion);
  const [systemReduced, setSystemReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setSystemReduced(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduced);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return preferCalm || systemReduced;
}
