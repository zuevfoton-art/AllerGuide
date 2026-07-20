import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { LoginType } from '@allerguide/core';
import { loginUser } from '@/src/services/auth-service';
import {
  getBiometricKind,
  isBiometricLoginEnabled,
  promptEnableBiometricLogin,
  unlockBiometricCredentials,
} from '@/src/services/app-lock-service';
import { Screen } from '@/src/components/Screen';
import { LanguagePicker } from '@/src/components/LanguagePicker';
import { useTranslation } from '@/src/store/locale-store';
import {
  AuthBiometricButton,
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
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricKind, setBiometricKind] = useState<'face' | 'fingerprint' | 'iris' | 'none'>('none');

  useEffect(() => {
    setBiometricReady(isBiometricLoginEnabled());
    void getBiometricKind().then(setBiometricKind);
  }, []);

  const biometricLabel =
    biometricKind === 'face'
      ? t('auth.biometric.loginFace')
      : biometricKind === 'fingerprint'
        ? t('auth.biometric.loginFingerprint')
        : t('auth.biometric.loginGeneric');

  const finishWithBiometricPrompt = async (creds: {
    loginType: LoginType;
    login: string;
    password: string;
  }) => {
    await promptEnableBiometricLogin(creds, {
      title: t('auth.biometric.enableTitle'),
      message: t('auth.biometric.enableMessage'),
      enable: t('auth.biometric.enableConfirm'),
      skip: t('auth.biometric.enableSkip'),
      reason: t('auth.biometric.enableReason'),
    });
    router.replace('/');
  };

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    const result = await loginUser({ loginType, login, password });
    setLoading(false);

    if (!result.ok) {
      setError(tAuthError(result.error));
      return;
    }

    await finishWithBiometricPrompt({ loginType, login: login.trim(), password });
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    setError('');
    const creds = await unlockBiometricCredentials(t('auth.biometric.unlockReason'));
    if (!creds) {
      setLoading(false);
      setError(t('auth.biometric.failed'));
      return;
    }

    const result = await loginUser(creds);
    setLoading(false);
    if (!result.ok) {
      setError(tAuthError(result.error));
      return;
    }

    router.replace('/');
  };

  const forgotLabel = FORGOT_LABELS[locale] ?? FORGOT_LABELS.en;

  const handleReplitLogin = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/api/login';
    }
  };

  return (
    <Screen>
      <LanguagePicker compact />
      <AuthHero title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')} />
      {biometricReady ? (
        <>
          <AuthBiometricButton
            label={biometricLabel}
            onPress={() => void handleBiometricLogin()}
            loading={loading}
            testID="auth-biometric-login"
          />
          <AuthDivider />
        </>
      ) : null}
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
      {Platform.OS === 'web' && (
        <>
          <AuthDivider />
          <AuthReplitButton onPress={handleReplitLogin} />
        </>
      )}
    </Screen>
  );
}
