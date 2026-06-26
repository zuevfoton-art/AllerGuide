import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radii } from '@/src/constants/layout';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

type UndoBannerProps = {
  message: string;
  actionLabel: string;
  onUndo: () => void;
  onDismiss?: () => void;
};

/** Transient snackbar with undo action (e.g. after deleting a safe product). */
export function UndoBanner({ message, actionLabel, onUndo, onDismiss }: UndoBannerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.wrap} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Text style={styles.message}>{message}</Text>
      <Pressable
        onPress={onUndo}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        style={styles.undoBtn}>
        <Text style={styles.undoText}>{actionLabel}</Text>
      </Pressable>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          hitSlop={8}
          style={styles.dismissBtn}>
          <Ionicons name="close" size={18} color={theme.colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles({ colors, fonts, shadows }: AppTheme) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.head,
      borderRadius: radii.md,
      paddingVertical: 12,
      paddingHorizontal: 14,
      ...(shadows.md as object),
    },
    message: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.onAccent,
      lineHeight: 18,
    },
    undoBtn: { paddingVertical: 4, paddingHorizontal: 2 },
    undoText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '700',
      color: colors.accent,
    },
    dismissBtn: { padding: 2 },
  });
}
