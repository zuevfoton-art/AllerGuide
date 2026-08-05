import { PropsWithChildren, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';
import { useKeyboardBottomInset } from '@/src/hooks/use-keyboard-bottom-inset';

type ScreenProps = {
  scroll?: boolean;
  /** Enables pull-to-refresh when provided (scroll mode only). */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Content pinned above the scroll area (stays visible while scrolling). */
  pinnedTop?: React.ReactNode;
};

export function Screen({
  children,
  scroll = true,
  onRefresh,
  refreshing = false,
  pinnedTop,
}: PropsWithChildren<ScreenProps>) {
  const { colors } = useTheme();
  const layout = useResponsiveLayout();
  const keyboardInset = useKeyboardBottomInset();
  // Android API 35+: `adjustResize` often no longer shrinks the window. Extra
  // bottom content inset lets ScrollView bring focused fields (e.g. password)
  // above the IME. iOS keeps using KeyboardAvoidingView padding instead.
  const androidKeyboardPad = Platform.OS === 'android' ? keyboardInset : 0;
  const scrollBottomPad = layout.bottomPadding + androidKeyboardPad;
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.bg },
        pinned: {
          width: '100%',
          maxWidth: layout.contentMaxWidth,
          alignSelf: 'center',
          paddingTop: layout.topPadding,
          paddingHorizontal: layout.horizontalPadding,
          paddingBottom: 8,
        },
        scrollOuter: { flex: 1, backgroundColor: colors.bg },
        scroll: {
          flexGrow: 1,
          backgroundColor: colors.bg,
          paddingTop: pinnedTop ? 0 : layout.topPadding,
          paddingBottom: scrollBottomPad,
          gap: 16,
        },
        content: {
          width: '100%',
          maxWidth: layout.contentMaxWidth,
          alignSelf: 'center',
          paddingHorizontal: layout.horizontalPadding,
          gap: 16,
        },
        contentFill: {
          flex: 1,
        },
        safe: {
          flex: 1,
          backgroundColor: colors.bg,
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: layout.topPadding,
          paddingBottom: layout.bottomPadding + androidKeyboardPad,
        },
      }),
    [
      androidKeyboardPad,
      colors.bg,
      layout.bottomPadding,
      layout.contentMaxWidth,
      layout.horizontalPadding,
      layout.topPadding,
      pinnedTop,
      scrollBottomPad,
    ],
  );

  const body = <View style={styles.content}>{children}</View>;

  // iOS: padding. Android: undefined — root IME insets (MainActivity) + scroll
  // content pad above handle the software keyboard without double-offset.
  const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : undefined;

  if (scroll) {
    return (
      <KeyboardAvoidingView style={styles.root} behavior={keyboardBehavior} keyboardVerticalOffset={0}>
        {pinnedTop ? <View style={styles.pinned}>{pinnedTop}</View> : null}
        <ScrollView
          style={styles.scrollOuter}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
                colors={[colors.accent]}
              />
            ) : undefined
          }>
          {body}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={keyboardBehavior}>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.content, styles.contentFill]}>{children}</View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
