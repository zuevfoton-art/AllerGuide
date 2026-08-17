import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMemo } from 'react';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { ScreenBackBrandHeader } from '@/src/components/brand/ScreenBackBrandHeader';
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
      <ScreenBackBrandHeader />
      <View style={styles.headerText}>
        <ScreenEyebrow />
        <Text style={ui.docTitle}>{title}</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.body}>{body.trim()}</Text>
      </ScrollView>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
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
