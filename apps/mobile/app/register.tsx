import { Text } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import type { LoginType } from '@allerguide/core';
import { registerUser } from '@/src/services/auth-service';
import { Screen } from '@/src/components/Screen';
import {
  AuthField,
  AuthHero,
  AuthLink,
  AuthModeToggle,
  AuthPrimaryButton,
  authStyles,
} from '@/src/components/AuthForm';

export default function RegisterScreen() {
  const [loginType, setLoginType] = useState<LoginType>('phone');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    const result = await registerUser({ loginType, login, password, confirmPassword });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.replace('/');
  };

  return (
    <Screen>
      <AuthHero title="Регистрация" subtitle="Создайте аккаунт по телефону или email" />

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
        placeholder="Минимум 6 символов"
        secureTextEntry
      />

      <AuthField
        label="Подтверждение пароля"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Повторите пароль"
        secureTextEntry
      />

      {error ? <Text style={authStyles.error}>{error}</Text> : null}

      <AuthPrimaryButton label="Зарегистрироваться" onPress={handleRegister} loading={loading} />

      <AuthLink
        text="Уже есть аккаунт?"
        linkText="Войти"
        onPress={() => router.push('/login')}
      />
    </Screen>
  );
}
