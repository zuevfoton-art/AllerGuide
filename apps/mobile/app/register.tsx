import { router } from 'expo-router';
import { useState } from 'react';
import type { LoginType } from '@allerguide/core';
import { registerUser } from '@/src/services/auth-service';
import { Screen } from '@/src/components/Screen';
import { LanguagePicker } from '@/src/components/LanguagePicker';
import { logCaughtError } from '@/src/services/error-reporting';
import { useTranslation } from '@/src/store/locale-store';
import {
  AuthError,
  AuthField,
  AuthHero,
  AuthLink,
  AuthModeToggle,
  AuthPrimaryButton,
} from '@/src/components/AuthForm';
import { PhoneInput } from '@/src/components/PhoneInput';

export default function RegisterScreen() {
  const { t, tAuthError } = useTranslation();
  const [loginType, setLoginType] = useState<LoginType>('phone');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await registerUser({ loginType, login, password, confirmPassword });

      if (!result.ok) {
        setError(tAuthError(result.error));
        return;
      }

      router.replace('/');
    } catch (error) {
      logCaughtError('RegisterScreen.handleRegister', error, {
        extra: { loginType },
      });
      setError(t('auth.errors.unexpected'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <LanguagePicker compact />
      <AuthHero title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')} />
      <AuthModeToggle loginType={loginType} onChange={setLoginType} />
      {loginType === 'phone' ? (
        <PhoneInput
          label={t('auth.phoneLabel')}
          value={login}
          onChangeText={setLogin}
          testID="auth-login-input"
        />
      ) : (
        <AuthField
          label={t('common.email')}
          value={login}
          onChangeText={setLogin}
          placeholder="name@example.com"
          keyboardType="email-address"
          testID="auth-login-input"
        />
      )}
      <AuthField
        label={t('common.password')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.passwordMinPlaceholder')}
        secureTextEntry
        testID="auth-password-input"
      />
      <AuthField
        label={t('auth.confirmPassword')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder={t('auth.confirmPasswordPlaceholder')}
        secureTextEntry
        testID="auth-confirm-password-input"
      />
      <AuthError message={error} />
      <AuthPrimaryButton
        label={t('auth.registerButton')}
        onPress={handleRegister}
        loading={loading}
        testID="auth-submit"
      />
      <AuthLink
        text={t('auth.hasAccount')}
        linkText={t('auth.loginLink')}
        onPress={() => router.push('/login')}
        testID="auth-login-link"
      />
    </Screen>
  );
}
