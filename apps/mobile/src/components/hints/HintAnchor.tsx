import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useHintsStore } from '@/src/store/hints-store';

export function useHintAnchor(anchorId: string) {
  const ref = useRef<View>(null);
  const registerAnchor = useHintsStore((state) => state.registerAnchor);
  const unregisterAnchor = useHintsStore((state) => state.unregisterAnchor);

  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        registerAnchor(anchorId, { x, y, width, height });
      }
    });
  }, [anchorId, registerAnchor]);

  const anchorNudge = useHintsStore((state) => state.anchorNudge);
  useEffect(() => {
    if (anchorNudge === 0) return;
    measure();
  }, [anchorNudge, measure]);

  useEffect(() => () => unregisterAnchor(anchorId), [anchorId, unregisterAnchor]);

  return { ref, onLayout: measure };
}

export function HintAnchor({
  id,
  children,
  style,
  testID,
}: {
  id: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { ref, onLayout } = useHintAnchor(id);
  return (
    <View ref={ref} onLayout={onLayout} collapsable={false} style={style} testID={testID}>
      {children}
    </View>
  );
}
