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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenBrandHeader } from '@/src/components/brand/ScreenBrandHeader';
import { shouldShowScreenBrandHeader } from '@/src/components/brand/brand-header-nav';
import { density } from '@/src/constants/layout';
import { useTheme } from '@/src/hooks/use-theme';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';
import { useKeyboardBottomInset } from '@/src/hooks/use-keyboard-bottom-inset';
import { resolveScreenKeyboardPadding } from '@/src/hooks/screen-keyboard-metrics';
import { SkipLink } from '@/src/components/FocusRing';
import { StatusBannerHost } from '@/src/components/StatusBanner';

type ScreenProps = {
  scroll?: boolean;
  /** Enables pull-to-refresh when provided (scroll mode only). */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Content pinned above the scroll area (stays visible while scrolling). */
  pinnedTop?: React.ReactNode;
  /** Sticky footer (e.g. a single Save action). */
  pinnedBottom?: React.ReactNode;
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
  pinnedBottom,
  showBrandHeader,
  brandHeaderLeft,
  brandHeaderRight,
}: PropsWithChildren<ScreenProps>) {
  const { colors } = useTheme();
  const layout = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardBottomInset();
  const keyboardPad = resolveScreenKeyboardPadding({
    platform: Platform.OS,
    keyboardInset,
    layoutBottomPadding: layout.bottomPadding,
    safeBottom: insets.bottom,
  });
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
  // Web lifts the whole screen (`rootPaddingBottom`) so sticky footers and
  // in-scroll CTAs are not painted under the overlay keyboard.
  const styles = useMemo(
    () =>
      StyleSheet.create({
        kav: { flex: 1, backgroundColor: colors.bg },
        root: {
          flex: 1,
          backgroundColor: colors.bg,
          paddingBottom: keyboardPad.rootPaddingBottom,
        },
        pinned: {
          width: '100%',
          maxWidth: layout.contentMaxWidth,
          alignSelf: 'center',
          paddingTop: layout.topPadding,
          paddingHorizontal: layout.horizontalPadding,
          paddingBottom: 8,
          gap: 8,
        },
        pinnedBottom: {
          width: '100%',
          maxWidth: layout.contentMaxWidth,
          alignSelf: 'center',
          paddingHorizontal: layout.horizontalPadding,
          paddingBottom: keyboardPad.pinnedPaddingBottom,
          paddingTop: 8,
        },
        scrollOuter: { flex: 1, backgroundColor: colors.bg },
        scroll: {
          flexGrow: 1,
          backgroundColor: colors.bg,
          paddingTop: hasPinned ? 0 : layout.topPadding,
          paddingBottom: keyboardPad.scrollPaddingBottom,
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
          paddingBottom: keyboardPad.scrollPaddingBottom,
        },
        nonScrollBrand: {
          paddingBottom: 8,
        },
      }),
    [
      colors.bg,
      hasPinned,
      keyboardPad.pinnedPaddingBottom,
      keyboardPad.rootPaddingBottom,
      keyboardPad.scrollPaddingBottom,
      layout.contentMaxWidth,
      layout.horizontalPadding,
      layout.topPadding,
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
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={keyboardBehavior}
        keyboardVerticalOffset={0}>
        <View testID="app-screen" style={styles.root}>
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
          {pinnedBottom ? <View style={styles.pinnedBottom}>{pinnedBottom}</View> : null}
          <StatusBannerHost />
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.kav} behavior={keyboardBehavior}>
      <View testID="app-screen" style={styles.root}>
        <SkipLink />
        <SafeAreaView style={styles.safe}>
          {brandHeader ? <View style={styles.nonScrollBrand}>{brandHeader}</View> : null}
          <View style={[styles.content, styles.contentFill]}>{children}</View>
        </SafeAreaView>
        <StatusBannerHost />
      </View>
    </KeyboardAvoidingView>
  );
}
