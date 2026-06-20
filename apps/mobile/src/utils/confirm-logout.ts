import { Alert } from 'react-native';
import type { Router } from 'expo-router';
import { logoutUser } from '@/src/services/auth-service';

export function confirmLogout(router: Router) {
  Alert.alert('Выйти из аккаунта?', 'Вы будете перенаправлены на экран входа.', [
    { text: 'Отмена', style: 'cancel' },
    {
      text: 'Выйти',
      style: 'destructive',
      onPress: () => {
        logoutUser();
        router.replace('/login');
      },
    },
  ]);
}
