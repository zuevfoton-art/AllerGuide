import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { type TextInput } from 'react-native';
import { applyLoginFieldInput } from '@allerguide/core';
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
  AuthPrimaryButton,
} from '@/src/components/AuthForm';
import { LoginField } from '@/src/components/LoginField';
import { authPasswordInputProps } from '@/src/constants/auth-input-props';

export default function LoginScreen() {
  const { t, tAuthError } = useTranslation();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    const resolved = applyLoginFieldInput(login);
    try {
      const result = await loginUser({
        loginType: resolved.loginType,
        login: resolved.canonical,
        password,
      });

      if (!result.ok) {
        setError(tAuthError(result.error));
        return;
      }

      router.replace('/');
    } catch (error) {
      logCaughtError('LoginScreen.handleLogin', error, {
        extra: { loginType: resolved.loginType },
      });
      setError(t('auth.errors.unexpected'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <LanguagePicker compact />
      <AuthHero title={t('auth.loginTitle')} />
      <LoginField
        label={t('auth.loginLabel')}
        value={login}
        onChangeText={setLogin}
        testID="auth-login-input"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <AuthField
        ref={passwordRef}
        label={t('common.password')}
        value={password}
        onChangeText={setPassword}
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
