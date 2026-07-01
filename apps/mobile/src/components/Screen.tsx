import { PropsWithChildren, useMemo } from 'react';
import { Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';

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
          paddingBottom: layout.bottomPadding,
          gap: 16,
        },
        content: {
          width: '100%',
          maxWidth: layout.contentMaxWidth,
          alignSelf: 'center',
          paddingHorizontal: layout.horizontalPadding,
          gap: 16,
        },
        // In non-scroll mode the content must fill the SafeAreaView so flex
        // children (e.g. the onboarding carousel / legal doc scroller) get a
        // bounded height instead of collapsing to zero.
        contentFill: {
          flex: 1,
        },
        safe: {
          flex: 1,
          backgroundColor: colors.bg,
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: layout.topPadding,
          paddingBottom: layout.bottomPadding,
        },
      }),
    [
      colors.bg,
      layout.bottomPadding,
      layout.contentMaxWidth,
      layout.horizontalPadding,
      layout.topPadding,
      pinnedTop,
    ],
  );

  const body = <View style={styles.content}>{children}</View>;

  if (scroll) {
    return (
      <View style={styles.root}>
        {pinnedTop ? <View style={styles.pinned}>{pinnedTop}</View> : null}
        <ScrollView
          style={styles.scrollOuter}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.content, styles.contentFill]}>{children}</View>
    </SafeAreaView>
  );
}
