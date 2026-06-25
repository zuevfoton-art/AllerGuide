import { PropsWithChildren, useMemo } from 'react';
import { Platform, RefreshControl, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';

type ScreenProps = {
  scroll?: boolean;
  /** Enables pull-to-refresh when provided (scroll mode only). */
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function Screen({ children, scroll = true, onRefresh, refreshing = false }: PropsWithChildren<ScreenProps>) {
  const { colors } = useTheme();
  const layout = useResponsiveLayout();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        scrollOuter: { flex: 1, backgroundColor: colors.bg },
        scroll: {
          flexGrow: 1,
          backgroundColor: colors.bg,
          paddingTop: layout.topPadding,
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
        safe: {
          flex: 1,
          backgroundColor: colors.bg,
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: layout.topPadding,
          paddingBottom: layout.bottomPadding,
        },
      }),
    [colors.bg, layout.bottomPadding, layout.contentMaxWidth, layout.horizontalPadding, layout.topPadding],
  );

  const body = <View style={styles.content}>{children}</View>;

  if (scroll) {
    return (
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
    );
  }

  return <SafeAreaView style={styles.safe}>{body}</SafeAreaView>;
}
