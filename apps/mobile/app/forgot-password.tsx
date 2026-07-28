import { router, useLocalSearchParams } from 'expo-router';
import { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { backendForgotPassword } from '@/src/services/backend-api';
import { BACKEND_AUTH_ENABLED } from '@/src/constants/features';
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

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(
    typeof params.email === 'string' ? params.email : '',
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!BACKEND_AUTH_ENABLED) {
      setError(t('auth.forgot.backendRequired'));
      return;
    }

    const trimmed = email.trim();
    if (!trimmed) {
      setError(t('auth.errors.emailRequired'));
      return;
    }
    if (!trimmed.includes('@')) {
      setError(t('auth.errors.emailInvalid'));
      return;
    }

    setLoading(true);
    setError('');

    const result = await backendForgotPassword({ login: trimmed, loginType: 'email' });

    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? t('common.error'));
      return;
    }

    if (result.data?.resetToken) {
      setResetToken(result.data.resetToken);
    }

    setSent(true);
  };

  if (sent) {
    return (
      <Screen>
        <AuthHero title={t('auth.forgot.successTitle')} subtitle="" />
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={48} color={theme.colors.accent} style={styles.successIcon} />
          <Text style={styles.successText}>{t('auth.forgot.successMessage')}</Text>
          {__DEV__ && resetToken ? (
            <View style={styles.tokenBox}>
              <Text style={styles.tokenLabel}>Ссылка для сброса (dev):</Text>
              <Text
                testID="auth-forgot-dev-reset-link"
                style={styles.tokenLink}
                onPress={() =>
                  router.push({ pathname: '/reset-password', params: { token: resetToken } })
                }>
                Перейти к смене пароля →
              </Text>
            </View>
          ) : null}
        </View>
        <AuthLink
          text=""
          linkText={t('auth.forgot.backToLogin')}
          onPress={() => router.replace('/login')}
          testID="auth-forgot-back-login"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AuthHero title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')} />
      <View style={styles.hintBox}>
        <Text style={styles.hintText}>{t('auth.forgot.emailOnlyHint')}</Text>
      </View>
      {!BACKEND_AUTH_ENABLED ? (
        <View style={styles.offlineBox}>
          <Text style={styles.offlineText}>{t('auth.forgot.backendRequired')}</Text>
        </View>
      ) : null}
      <AuthField
        label={t('auth.forgot.emailLabel')}
        value={email}
        onChangeText={setEmail}
        placeholder={t('auth.forgot.emailPlaceholder')}
        keyboardType="email-address"
        testID="auth-forgot-email"
      />
      <AuthError message={error} />
      <AuthPrimaryButton
        label={t('auth.forgot.submitButton')}
        onPress={handleSubmit}
        loading={loading}
        testID="auth-forgot-submit"
      />
      <AuthLink
        text=""
        linkText={t('auth.forgot.backToLogin')}
        onPress={() => router.back()}
        testID="auth-forgot-back"
      />
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    successBox: {
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
    },
    successIcon: {
      marginBottom: 4,
    },
    successText: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    tokenBox: {
      marginTop: 12,
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
      width: '100%',
    },
    tokenLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    tokenLink: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      color: colors.accent,
      fontWeight: '600',
    },
    hintBox: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: 8,
      padding: 12,
      marginBottom: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    hintText: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    offlineBox: {
      backgroundColor: colors.warningLight,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    offlineText: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
}
