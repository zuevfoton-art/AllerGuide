import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LoginType } from '@allerguide/core';
import { registerUser } from '@/src/services/auth-service';
import { Screen } from '@/src/components/Screen';
import {
  AuthError,
  AuthField,
  AuthHero,
  AuthLink,
  AuthModeToggle,
  AuthPrimaryButton,
} from '@/src/components/AuthForm';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';

export default function RegisterScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loginType, setLoginType] = useState<LoginType>('phone');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!acceptedTerms) {
      setError('Примите условия использования и политику конфиденциальности.');
      return;
    }

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

      <Pressable
        style={styles.termsRow}
        onPress={() => setAcceptedTerms((value) => !value)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acceptedTerms }}
        accessibilityLabel="Принимаю условия использования и политику конфиденциальности">
        <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
          {acceptedTerms ? <Ionicons name="checkmark" size={14} color={theme.colors.onAccent} /> : null}
        </View>
        <Text style={styles.termsText}>
          Я принимаю{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/legal/terms')}>
            условия использования
          </Text>{' '}
          и{' '}
          <Text style={styles.termsLink} onPress={() => router.push('/legal/privacy')}>
            политику конфиденциальности
          </Text>
        </Text>
      </Pressable>

      <AuthError message={error} />
      <AuthPrimaryButton label="Зарегистрироваться" onPress={handleRegister} loading={loading} />
      <AuthLink
        text="Уже есть аккаунт?"
        linkText="Войти"
        onPress={() => router.push('/login')}
      />
    </Screen>
  );
}

function createStyles({ colors }: AppTheme) {
  return StyleSheet.create({
    termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
      backgroundColor: colors.card,
    },
    checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
    termsText: { flex: 1, fontSize: 13, lineHeight: 20, color: colors.textSecondary },
    termsLink: { color: colors.accent, fontWeight: '700' },
  });
}
