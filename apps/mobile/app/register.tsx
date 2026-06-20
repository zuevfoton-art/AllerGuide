import { router } from 'expo-router';
import { useState } from 'react';
import type { LoginType } from '@allerguide/core';
import { registerUser } from '@/src/services/auth-service';
import { Screen } from '@/src/components/Screen';
import { LanguagePicker } from '@/src/components/LanguagePicker';
import { useTranslation } from '@/src/store/locale-store';
import {
  AuthError,
  AuthField,
  AuthHero,
  AuthLink,
  AuthModeToggle,
  AuthPrimaryButton,
} from '@/src/components/AuthForm';

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
    const result = await registerUser({ loginType, login, password, confirmPassword });
    setLoading(false);

    if (!result.ok) {
      setError(tAuthError(result.error));
      return;
    }

    router.replace('/');
  };

  return (
    <Screen>
      <LanguagePicker compact />
      <AuthHero title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')} />
      <AuthModeToggle loginType={loginType} onChange={setLoginType} />
      <AuthField
        label={loginType === 'phone' ? t('auth.phoneLabel') : t('common.email')}
        value={login}
        onChangeText={setLogin}
        placeholder={loginType === 'phone' ? t('auth.phonePlaceholder') : 'name@example.com'}
        keyboardType={loginType === 'phone' ? 'phone-pad' : 'email-address'}
      />
      <AuthField
        label={t('common.password')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.passwordMinPlaceholder')}
        secureTextEntry
      />
      <AuthField
        label={t('auth.confirmPassword')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder={t('auth.confirmPasswordPlaceholder')}
        secureTextEntry
      />
      <AuthError message={error} />
      <AuthPrimaryButton label={t('auth.registerButton')} onPress={handleRegister} loading={loading} />
      <AuthLink
        text={t('auth.hasAccount')}
        linkText={t('auth.loginLink')}
        onPress={() => router.push('/login')}
      />
    </Screen>
  );
}
