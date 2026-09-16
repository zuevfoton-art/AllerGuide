import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useAskChat } from '@/src/components/AskChatPanel';
import { useTranslation } from '@/src/store/locale-store';

/**
 * Fullscreen Ask route — deep-link / fallback when the Today sheet is unavailable.
 */
export default function AskScreen() {
  const { t } = useTranslation();
  const { body, composer } = useAskChat({ openSource: 'route' });

  return (
    <Screen pinnedBottom={composer}>
      <ScreenHeader
        onBack={() => router.back()}
        eyebrow={t('ask.eyebrow')}
        title={t('ask.title')}
      />
      {body}
    </Screen>
  );
}
