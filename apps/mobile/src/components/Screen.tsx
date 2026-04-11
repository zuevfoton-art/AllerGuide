import { PropsWithChildren } from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { colors } from '@/src/constants/theme';

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  if (scroll) {
    return <ScrollView contentContainerStyle={styles.scroll}>{children}</ScrollView>;
  }
  return <SafeAreaView style={styles.safe}>{children}</SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream, padding: 24 },
  scroll: { flexGrow: 1, backgroundColor: colors.cream, padding: 24, gap: 12 },
});
