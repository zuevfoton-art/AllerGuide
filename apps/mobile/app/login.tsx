import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { type TextInput } from 'react-native';
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
import {
  authEmailInputProps,
  authPasswordInputProps,
  authPhoneInputProps,
} from '@/src/constants/auth-input-props';

export default function LoginScreen() {
  const { t, tAuthError } = useTranslation();
  const [loginType, setLoginType] = useState<LoginType>('phone');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

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
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
          {...authPhoneInputProps()}
        />
      ) : (
        <AuthField
          label={t('common.email')}
          value={login}
          onChangeText={setLogin}
          placeholder={t('auth.forgot.emailPlaceholder')}
          testID="auth-login-input"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
          {...authEmailInputProps()}
        />
      )}
      <AuthField
        ref={passwordRef}
        label={t('common.password')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.passwordPlaceholder')}
        secureTextEntry
        testID="auth-password-input"
        returnKeyType="go"
        submitBehavior="blurAndSubmit"
        onSubmitEditing={() => void handleLogin()}
        {...authPasswordInputProps('current')}
      />
      <AuthForgotLink text={t('auth.forgotLink')} onPress={() => router.push('/forgot-password')} />
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
