import { PropsWithChildren } from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { colors } from '@/src/constants/theme';

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  if (scroll) {
    return (
      <ScrollView
        style={styles.scrollOuter}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    );
  }
  return <SafeAreaView style={styles.safe}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  scrollOuter: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 32, gap: 16 },
  safe: { flex: 1, backgroundColor: colors.bg, padding: 20 },
});
