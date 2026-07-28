import { router } from 'expo-router';
import { useState } from 'react';
import { Platform } from 'react-native';
import type { LoginType } from '@allerguide/core';
import { loginUser } from '@/src/services/auth-service';
import { Screen } from '@/src/components/Screen';
import { LanguagePicker } from '@/src/components/LanguagePicker';
import { useTranslation } from '@/src/store/locale-store';
import {
  AuthDivider,
  AuthError,
  AuthField,
  AuthForgotLink,
  AuthHero,
  AuthLink,
  AuthModeToggle,
  AuthPrimaryButton,
  AuthReplitButton,
} from '@/src/components/AuthForm';

export default function LoginScreen() {
  const { t, tAuthError } = useTranslation();
  const [loginType, setLoginType] = useState<LoginType>('phone');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRecoverHint, setShowRecoverHint] = useState(false);

  const openForgotPassword = () => {
    const emailPrefill = loginType === 'email' ? login.trim() : '';
    router.push({
      pathname: '/forgot-password',
      params: emailPrefill ? { email: emailPrefill } : undefined,
    });
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    setShowRecoverHint(false);
    const result = await loginUser({ loginType, login, password });
    setLoading(false);

    if (!result.ok) {
      setError(tAuthError(result.error));
      if (result.error === 'Неверный логин или пароль.' || result.error === 'wrongCredentials') {
        setShowRecoverHint(true);
      }
      return;
    }

    router.replace('/');
  };

  return (
    <Screen>
      <LanguagePicker compact />
      <AuthHero title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')} />
      <AuthModeToggle loginType={loginType} onChange={setLoginType} />
      <AuthField
        label={loginType === 'phone' ? t('auth.phoneLabel') : t('common.email')}
        value={login}
        onChangeText={setLogin}
        placeholder={loginType === 'phone' ? t('auth.phonePlaceholder') : 'name@example.com'}
        keyboardType={loginType === 'phone' ? 'phone-pad' : 'email-address'}
        testID="auth-login-input"
      />
      <AuthField
        label={t('common.password')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.passwordPlaceholder')}
        secureTextEntry
        testID="auth-password-input"
      />
      <AuthForgotLink
        text={t('auth.forgot.link')}
        onPress={openForgotPassword}
        testID="auth-forgot-link"
      />
      <AuthError message={error} />
      {showRecoverHint ? (
        <AuthForgotLink
          text={t('auth.forgot.recoverHint')}
          onPress={openForgotPassword}
          testID="auth-forgot-recover-hint"
        />
      ) : null}
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
      {Platform.OS === 'web' && (
        <>
          <AuthDivider />
          <AuthReplitButton onPress={() => {
            if (typeof window !== 'undefined') {
              window.location.href = '/api/login';
            }
          }} />
        </>
      )}
    </Screen>
  );
}
