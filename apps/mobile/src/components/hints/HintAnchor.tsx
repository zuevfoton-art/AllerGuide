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

  useEffect(() => () => unregisterAnchor(anchorId), [anchorId, unregisterAnchor]);

  return { ref, onLayout: measure };
}

export function HintAnchor({
  id,
  children,
  style,
}: {
  id: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { ref, onLayout } = useHintAnchor(id);
  return (
    <View ref={ref} onLayout={onLayout} collapsable={false} style={style}>
      {children}
    </View>
  );
}
