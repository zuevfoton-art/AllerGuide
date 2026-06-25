import { Alert } from 'react-native';
import type { Router } from 'expo-router';
import { logoutUser } from '@/src/services/auth-service';
import { useLocaleStore } from '@/src/store/locale-store';

let loggingOut = false;

export function confirmLogout(router: Router) {
  const { t } = useLocaleStore.getState();
  Alert.alert(t('profiles.logoutTitle'), t('profiles.logoutMessage'), [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('profiles.logoutConfirm'),
      style: 'destructive',
      onPress: () => {
        if (loggingOut) return;
        loggingOut = true;
        logoutUser();
        router.replace('/login');
        loggingOut = false;
      },
    },
  ]);
}
