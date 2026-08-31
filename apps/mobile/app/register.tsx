import { router } from 'expo-router';
import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { applyLoginFieldInput } from '@allerguide/core';
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
  AuthPrimaryButton,
} from '@/src/components/AuthForm';
import { LoginField } from '@/src/components/LoginField';
import { authPasswordInputProps } from '@/src/constants/auth-input-props';

export default function RegisterScreen() {
  const { t, tAuthError } = useTranslation();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    const resolved = applyLoginFieldInput(login);
    try {
      const result = await registerUser({
        loginType: resolved.loginType,
        login: resolved.canonical,
        password,
        confirmPassword,
      });

      if (!result.ok) {
        setError(tAuthError(result.error));
        return;
      }

      router.replace('/');
    } catch (error) {
      logCaughtError('RegisterScreen.handleRegister', error, {
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
      <AuthHero title={t('auth.registerTitle')} />
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
        placeholder={t('auth.passwordMinPlaceholder')}
        secureTextEntry
        testID="auth-password-input"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => confirmRef.current?.focus()}
        {...authPasswordInputProps('new')}
      />
      <AuthField
        ref={confirmRef}
        label={t('auth.confirmPassword')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        testID="auth-confirm-password-input"
        returnKeyType="go"
        submitBehavior="blurAndSubmit"
        onSubmitEditing={() => void handleRegister()}
        {...authPasswordInputProps('new')}
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
