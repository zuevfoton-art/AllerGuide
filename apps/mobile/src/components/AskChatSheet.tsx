import { useMemo } from 'react';
import { BottomSheet } from '@/src/components/BottomSheet';
import { AskChatPanel } from '@/src/components/AskChatPanel';
import { useTranslation } from '@/src/store/locale-store';

export type AskChatSheetProps = {
  visible: boolean;
  onClose: () => void;
  context?: string[];
  quickQuestions?: string[];
};

/**
 * Full-height Ask bottom sheet for Today (and other surfaces).
 * Keeps `/ask` as deep-link / fullscreen fallback.
 */
export function AskChatSheet({ visible, onClose, context, quickQuestions }: AskChatSheetProps) {
  const { t } = useTranslation();
  const questions = useMemo(
    () => quickQuestions ?? [t('ask.quickWhy'), t('ask.quickToday')],
    [quickQuestions, t],
  );

  if (!visible) return null;

  return (
    <BottomSheet
      visible={visible}
      title={t('ask.title')}
      onClose={onClose}
      fullHeight
      testID="ask-chat-sheet"
      accessibilityLabel={t('ask.title')}>
      <AskChatPanel
        openSource="today"
        context={context}
        quickQuestions={questions}
        onHandoffSos={onClose}
        testID="ask-panel"
      />
    </BottomSheet>
  );
}
