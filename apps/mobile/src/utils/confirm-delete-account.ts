import { Alert } from 'react-native';
import type { Router } from 'expo-router';
import { deleteAccount } from '@/src/services/auth-service';
import { useLocaleStore } from '@/src/store/locale-store';

export function confirmDeleteAccount(router: Router) {
  const { t } = useLocaleStore.getState();
  Alert.alert(t('profiles.deleteAccountTitle'), t('profiles.deleteAccountMessage'), [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('profiles.deleteAccountConfirm'),
      style: 'destructive',
      onPress: () => {
        void (async () => {
          const result = await deleteAccount();
          if (!result.ok) {
            Alert.alert(t('common.error'), result.error);
            return;
          }
          router.replace('/login');
        })();
      },
    },
  ]);
}
