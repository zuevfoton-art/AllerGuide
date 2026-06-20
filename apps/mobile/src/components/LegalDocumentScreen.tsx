import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/Screen';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

interface LegalDocumentScreenProps {
  title: string;
  body: string;
}

export function LegalDocumentScreen({ title, body }: LegalDocumentScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Назад">
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.body}>{body.trim()}</Text>
      </ScrollView>
    </Screen>
  );
}

function createStyles({ colors }: AppTheme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.text },
    content: { flexGrow: 1, paddingBottom: 32 },
    body: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.textSecondary,
      ...(Platform.OS === 'web' ? { whiteSpace: 'pre-wrap' as const } : null),
    },
  });
}
