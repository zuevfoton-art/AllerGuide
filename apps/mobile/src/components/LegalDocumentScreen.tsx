import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/src/components/Screen';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

interface LegalDocumentScreenProps {
  title: string;
  body: string;
}

export function LegalDocumentScreen({ title, body }: LegalDocumentScreenProps) {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Назад">
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={ui.docLabel}>AllerGuide</Text>
          <Text style={ui.docTitle}>{title}</Text>
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.body}>{body.trim()}</Text>
      </ScrollView>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 6,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 2,
    },
    headerText: { flex: 1, gap: 2 },
    content: { flexGrow: 1, paddingBottom: 32 },
    body: {
      fontFamily: fonts.sans,
      fontSize: 14,
      lineHeight: 22,
      color: colors.textSecondary,
      ...(Platform.OS === 'web' ? { whiteSpace: 'pre-wrap' as const } : null),
    },
  });
}
