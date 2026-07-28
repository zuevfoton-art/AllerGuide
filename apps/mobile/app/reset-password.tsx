import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { backendResetPassword, backendVerifyResetToken } from '@/src/services/backend-api';
import { Screen } from '@/src/components/Screen';
import { useTranslation } from '@/src/store/locale-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import {
  AuthField,
  AuthHero,
  AuthPrimaryButton,
  AuthLink,
  AuthError,
} from '@/src/components/AuthForm';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(Boolean(token));
  const [tokenValid, setTokenValid] = useState(Boolean(token));
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!token) {
        setTokenValid(false);
        setVerifying(false);
        return;
      }

      setVerifying(true);
      const result = await backendVerifyResetToken(token);
      if (cancelled) return;

      setTokenValid(result.ok);
      if (!result.ok) {
        setError(t('auth.resetPassword.invalidToken'));
      }
      setVerifying(false);
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  const handleSubmit = async () => {
    if (!token || !tokenValid) {
      setError(t('auth.resetPassword.invalidToken'));
      return;
    }
    if (password.length < 6) {
      setError(t('auth.errors.passwordMin'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.errors.passwordMismatch'));
      return;
    }

    setLoading(true);
    setError('');

    const result = await backendResetPassword({ token, password, confirmPassword });

    setLoading(false);

    if (!result.ok) {
      const msg = result.error ?? '';
      if (msg.includes('недействительна') || msg.includes('invalid') || msg.includes('expired')) {
        setError(t('auth.resetPassword.invalidToken'));
      } else {
        setError(msg || t('common.error'));
      }
      return;
    }

    setDone(true);
  };

  if (done) {
    return (
      <Screen>
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={64} color={theme.colors.accent} />
          <Text style={styles.successTitle}>{t('auth.resetPassword.successTitle')}</Text>
          <Text style={styles.successText}>{t('auth.resetPassword.successMessage')}</Text>
        </View>
        <AuthLink
          text=""
          linkText={t('auth.loginLink')}
          onPress={() => router.replace('/login')}
          testID="auth-reset-login-link"
        />
      </Screen>
    );
  }

  if (verifying) {
    return (
      <Screen>
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AuthHero title={t('auth.resetPassword.title')} subtitle={t('auth.resetPassword.subtitle')} />
      {!tokenValid && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{t('auth.resetPassword.invalidToken')}</Text>
        </View>
      )}
      <AuthField
        label={t('auth.resetPassword.newPassword')}
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.passwordMinPlaceholder')}
        secureTextEntry
        testID="auth-reset-password"
      />
      <AuthField
        label={t('auth.resetPassword.confirmPassword')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder={t('auth.confirmPasswordPlaceholder')}
        secureTextEntry
        testID="auth-reset-confirm"
      />
      <AuthError message={error} />
      <AuthPrimaryButton
        label={t('auth.resetPassword.submitButton')}
        onPress={handleSubmit}
        loading={loading}
        testID="auth-reset-submit"
      />
      <AuthLink
        text=""
        linkText={t('auth.forgot.backToLogin')}
        onPress={() => router.replace('/login')}
        testID="auth-reset-back-login"
      />
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    successBox: {
      alignItems: 'center',
      gap: 12,
      paddingVertical: 24,
    },
    successTitle: {
      fontFamily: fonts.serifBold,
      fontSize: 22,
      fontWeight: '700',
      color: colors.head,
    },
    successText: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    loadingBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    errorBox: {
      backgroundColor: colors.dangerLight,
      borderRadius: 6,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    errorText: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.danger,
      textAlign: 'center',
    },
  });
}
