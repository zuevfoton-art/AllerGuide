import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BottomSheet } from '@/src/components/BottomSheet';
import { useAskChat } from '@/src/components/AskChatPanel';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

export type AskChatSheetProps = {
  visible: boolean;
  onClose: () => void;
  context?: string[];
  quickQuestions?: string[];
};

/**
 * Full-height Ask bottom sheet from the global FAB (and other overlays).
 * Composer is pinned in `footer` so Modal keyboard lift keeps it above the IME.
 */
export function AskChatSheet({ visible, onClose, context, quickQuestions }: AskChatSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const questions = useMemo(
    () => quickQuestions ?? [t('ask.quickWhy'), t('ask.quickToday')],
    [quickQuestions, t],
  );
  const { body, composer } = useAskChat({
    openSource: 'sheet',
    context,
    quickQuestions: questions,
    onHandoffSos: onClose,
    testID: 'ask-panel',
  });

  if (!visible) return null;

  return (
    <BottomSheet
      visible={visible}
      title={t('ask.title')}
      onClose={onClose}
      fullHeight
      testID="ask-chat-sheet"
      accessibilityLabel={t('ask.title')}
      footer={<View style={styles.footer}>{composer}</View>}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        testID="ask-panel">
        {body}
      </ScrollView>
    </BottomSheet>
  );
}

function createStyles({ colors }: AppTheme) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
    footer: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 4,
    },
  });
}
