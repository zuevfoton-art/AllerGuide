import { router } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { AskChatPanel } from '@/src/components/AskChatPanel';
import { useTranslation } from '@/src/store/locale-store';

/**
 * Fullscreen Ask route — deep-link / fallback when the FAB sheet is unavailable.
 * Uses safe-area clearance (not tab-bar padding) so the composer is not floated up.
 */
export default function AskScreen() {
  const { t } = useTranslation();

  return (
    <Screen
      scroll={false}
      showBrandHeader={false}
      bottomClearance="safe"
      pinnedTop={
        <ScreenHeader
          onBack={() => router.back()}
          eyebrow={t('ask.eyebrow')}
          title={t('ask.title')}
        />
      }>
      <AskChatPanel openSource="route" testID="ask-panel" />
    </Screen>
  );
}
