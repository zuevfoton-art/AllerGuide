import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { density, radii } from '@/src/constants/layout';
import { pressedOpacity } from '@/src/constants/motion';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

type DiaryNewEntryFabProps = {
  onPress: () => void;
  accessibilityLabel: string;
  testID?: string;
};

/** Figma diary `fab` 56×56 — plus only; handlers stay on the diary screen. */
export function DiaryNewEntryFab({
  onPress,
  accessibilityLabel,
  testID = 'diary-new-entry',
}: DiaryNewEntryFabProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, theme.shadows.raisedStrong, pressed && styles.pressed]}>
      <Ionicons name="add" size={28} color={theme.colors.onAccent} />
    </Pressable>
  );
}

function createStyles({ colors }: AppTheme) {
  const size = density.tapMinHeightFab;
  return StyleSheet.create({
    fab: {
      width: size,
      height: size,
      borderRadius: radii.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
    },
    pressed: { opacity: pressedOpacity },
  });
}
