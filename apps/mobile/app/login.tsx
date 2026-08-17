import { router } from 'expo-router';
import { useState } from 'react';
import type { LoginType } from '@allerguide/core';
import { loginUser } from '@/src/services/auth-service';
import { Screen } from '@/src/components/Screen';
import { LanguagePicker } from '@/src/components/LanguagePicker';
import { logCaughtError } from '@/src/services/error-reporting';
import { useTranslation } from '@/src/store/locale-store';
import {
  AuthError,
  AuthField,
  AuthForgotLink,
  AuthHero,
  AuthLink,
  AuthModeToggle,
  AuthPrimaryButton,
} from '@/src/components/AuthForm';
import { PhoneInput } from '@/src/components/PhoneInput';

const FORGOT_LABELS: Record<string, string> = {
  ru: 'Забыли пароль?',
  en: 'Forgot password?',
  es: '¿Olvidaste tu contraseña?',
  fr: 'Mot de passe oublié ?',
  de: 'Passwort vergessen?',
  it: 'Password dimenticata?',
};

export default function LoginScreen() {
  const { t, tAuthError, locale } = useTranslation();
  const [loginType, setLoginType] = useState<LoginType>('phone');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await loginUser({ loginType, login, password });

      if (!result.ok) {
        setError(tAuthError(result.error));
        return;
      }

      router.replace('/');
    } catch (error) {
      logCaughtError('LoginScreen.handleLogin', error, {
        extra: { loginType },
      });
      setError(t('auth.errors.unexpected'));
    } finally {
      setLoading(false);
    }
  };

  const forgotLabel = FORGOT_LABELS[locale] ?? FORGOT_LABELS.en;

  return (
    <Screen>
      <LanguagePicker compact />
      <AuthHero title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')} />
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
        placeholder={t('auth.passwordPlaceholder')}
        secureTextEntry
        testID="auth-password-input"
      />
      <AuthForgotLink text={forgotLabel} onPress={() => router.push('/forgot-password')} />
      <AuthError message={error} />
      <AuthPrimaryButton
        label={t('auth.loginButton')}
        onPress={handleLogin}
        loading={loading}
        testID="auth-submit"
      />
      <AuthLink
        text={t('auth.noAccount')}
        linkText={t('auth.registerLink')}
        onPress={() => router.push('/register')}
        testID="auth-register-link"
      />
    </Screen>
  );
}
