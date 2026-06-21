import { PropsWithChildren, useMemo } from 'react';
import { Platform, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '@/src/hooks/use-theme';
import { useResponsiveLayout } from '@/src/hooks/use-responsive-layout';

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
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
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        {body}
      </ScrollView>
    );
  }

  return <SafeAreaView style={styles.safe}>{body}</SafeAreaView>;
}
