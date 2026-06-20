import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LoginType } from '@allerguide/core';
import { loginUser } from '@/src/services/auth-service';
import { Screen } from '@/src/components/Screen';
import {
  AuthError,
  AuthField,
  AuthHero,
  AuthLink,
  AuthModeToggle,
  AuthPrimaryButton,
} from '@/src/components/AuthForm';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [loginType, setLoginType] = useState<LoginType>('phone');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    const result = await loginUser({ loginType, login, password });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.replace('/');
  };

  return (
    <Screen>
      <AuthHero title={t('auth.login')} subtitle="Войдите по номеру телефона или email" />
      <AuthModeToggle loginType={loginType} onChange={setLoginType} />
      <AuthField
        label={loginType === 'phone' ? 'Номер телефона' : 'Email'}
        value={login}
        onChangeText={setLogin}
        placeholder={loginType === 'phone' ? '+7 999 123-45-67' : 'name@example.com'}
        keyboardType={loginType === 'phone' ? 'phone-pad' : 'email-address'}
      />
      <AuthField
        label="Пароль"
        value={password}
        onChangeText={setPassword}
        placeholder="Введите пароль"
        secureTextEntry
      />
      <AuthError message={error} />
      <AuthPrimaryButton label={t('auth.loginAction')} onPress={handleLogin} loading={loading} />
      <AuthLink
        text={t('auth.noAccount')}
        linkText={t('auth.register')}
        onPress={() => router.push('/register')}
      />
    </Screen>
  );
}
