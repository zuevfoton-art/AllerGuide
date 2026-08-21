import { PropsWithChildren, useMemo, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { usePathname } from 'expo-router';
import { ScreenBrandHeader } from '@/src/components/brand/ScreenBrandHeader';
import { shouldShowScreenBrandHeader } from '@/src/components/brand/brand-header-nav';
import { density } from '@/src/constants/layout';
import { useTheme } from '@/src/hooks/use-theme';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';
import { useKeyboardBottomInset } from '@/src/hooks/use-keyboard-bottom-inset';
import { SkipLink } from '@/src/components/FocusRing';

type ScreenProps = {
  scroll?: boolean;
  /** Enables pull-to-refresh when provided (scroll mode only). */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Content pinned above the scroll area (stays visible while scrolling). */
  pinnedTop?: React.ReactNode;
  /** Override auto brand header (hidden on login/register). */
  showBrandHeader?: boolean;
  brandHeaderLeft?: ReactNode;
  brandHeaderRight?: ReactNode;
};

export function Screen({
  children,
  scroll = true,
  onRefresh,
  refreshing = false,
  pinnedTop,
  showBrandHeader,
  brandHeaderLeft,
  brandHeaderRight,
}: PropsWithChildren<ScreenProps>) {
  const { colors } = useTheme();
  const layout = useResponsiveLayout();
  const keyboardInset = useKeyboardBottomInset();
  const pathname = usePathname();
  const brandVisible = showBrandHeader ?? shouldShowScreenBrandHeader(pathname);
  const brandHeader = brandVisible ? (
    <ScreenBrandHeader left={brandHeaderLeft} right={brandHeaderRight} />
  ) : null;
  const hasPinned = Boolean(brandHeader || pinnedTop);
  const pinnedContent = hasPinned ? (
    <>
      {brandHeader}
      {pinnedTop}
    </>
  ) : null;
  // Android API 35+: `adjustResize` often no longer shrinks the window. Extra
  // bottom content inset lets ScrollView bring focused fields (e.g. password)
  // above the IME. iOS keeps using KeyboardAvoidingView padding instead.
  const extraKeyboardPad = Platform.OS === 'ios' ? 0 : keyboardInset;
  const scrollBottomPad = layout.bottomPadding + extraKeyboardPad;
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
          gap: 8,
        },
        scrollOuter: { flex: 1, backgroundColor: colors.bg },
        scroll: {
          flexGrow: 1,
          backgroundColor: colors.bg,
          paddingTop: hasPinned ? 0 : layout.topPadding,
          paddingBottom: scrollBottomPad,
          gap: density.screenGap,
        },
        content: {
          width: '100%',
          maxWidth: layout.contentMaxWidth,
          alignSelf: 'center',
          paddingHorizontal: layout.horizontalPadding,
          gap: density.screenGap,
        },
        contentFill: {
          flex: 1,
        },
        safe: {
          flex: 1,
          backgroundColor: colors.bg,
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: layout.topPadding,
          paddingBottom: layout.bottomPadding + extraKeyboardPad,
        },
        nonScrollBrand: {
          paddingBottom: 8,
        },
      }),
    [
      extraKeyboardPad,
      colors.bg,
      hasPinned,
      layout.bottomPadding,
      layout.contentMaxWidth,
      layout.horizontalPadding,
      layout.topPadding,
      scrollBottomPad,
    ],
  );

  const body = (
    <View
      nativeID="content"
      style={styles.content}
      {...(Platform.OS === 'web' ? ({ tabIndex: -1 } as object) : null)}>
      {children}
    </View>
  );

  // iOS: padding. Android: undefined — root IME insets (MainActivity) + scroll
  // content pad above handle the software keyboard without double-offset.
  const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : undefined;

  if (scroll) {
    return (
      <KeyboardAvoidingView style={styles.root} behavior={keyboardBehavior} keyboardVerticalOffset={0}>
        <SkipLink />
        {pinnedContent ? <View style={styles.pinned}>{pinnedContent}</View> : null}
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
      <SkipLink />
      <SafeAreaView style={styles.safe}>
        {brandHeader ? <View style={styles.nonScrollBrand}>{brandHeader}</View> : null}
        <View style={[styles.content, styles.contentFill]}>{children}</View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
