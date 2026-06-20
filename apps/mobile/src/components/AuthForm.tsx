import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LoginType } from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { useMemo } from 'react';

interface AuthModeToggleProps {
  loginType: LoginType;
  onChange: (type: LoginType) => void;
}

export function AuthModeToggle({ loginType, onChange }: AuthModeToggleProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View style={styles.toggleRow}>
      <Pressable
        style={[styles.toggleBtn, loginType === 'phone' && styles.toggleActive]}
        onPress={() => onChange('phone')}>
        <Ionicons
          name="call"
          size={16}
          color={loginType === 'phone' ? theme.colors.teal : theme.colors.textSecondary}
        />
        <Text style={[styles.toggleText, loginType === 'phone' && styles.toggleTextActive]}>{t('common.phone')}</Text>
      </Pressable>
      <Pressable
        style={[styles.toggleBtn, loginType === 'email' && styles.toggleActive]}
        onPress={() => onChange('email')}>
        <Ionicons
          name="mail"
          size={16}
          color={loginType === 'email' ? theme.colors.teal : theme.colors.textSecondary}
        />
        <Text style={[styles.toggleText, loginType === 'email' && styles.toggleTextActive]}>{t('common.email')}</Text>
      </Pressable>
    </View>
  );
}

interface AuthFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
}: AuthFieldProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={styles.input}
      />
    </View>
  );
}

export function AuthPrimaryButton({
  label,
  onPress,
  loading,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <Pressable
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading}>
      <Text style={styles.buttonText}>{loading ? t('common.wait') : label}</Text>
    </Pressable>
  );
}

export function AuthLink({
  text,
  linkText,
  onPress,
}: {
  text: string;
  linkText: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable style={styles.linkWrap} onPress={onPress}>
      <Text style={styles.linkText}>
        {text} <Text style={styles.linkAccent}>{linkText}</Text>
      </Text>
    </Pressable>
  );
}

export function AuthHero({ title, subtitle }: { title: string; subtitle: string }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.hero}>
      <View style={styles.logoWrap}>
        <Ionicons name="leaf" size={32} color={theme.colors.onAccent} />
      </View>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
    </View>
  );
}

export function AuthError({ message }: { message: string }) {
  const theme = useTheme();
  if (!message) return null;
  return <Text style={{ color: theme.colors.danger, fontSize: 14, textAlign: 'center' }}>{message}</Text>;
}

function createStyles({ colors, shadows }: AppTheme) {
  return StyleSheet.create({
    hero: { alignItems: 'center', paddingVertical: 12, gap: 8 },
    logoWrap: {
      width: 64,
      height: 64,
      borderRadius: 18,
      backgroundColor: colors.teal,
      alignItems: 'center',
      justifyContent: 'center',
      ...(shadows.glass as object),
    },
    heroTitle: { fontSize: 32, fontWeight: '800', color: colors.text, letterSpacing: -0.8 },
    heroSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    toggleRow: { flexDirection: 'row', gap: 10 },
    toggleBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    toggleActive: { borderColor: colors.teal, backgroundColor: colors.tealLight },
    toggleText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
    toggleTextActive: { color: colors.teal, fontWeight: '700' },
    fieldWrap: { gap: 6 },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    input: {
      backgroundColor: colors.card,
      padding: 15,
      borderRadius: 14,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    button: {
      backgroundColor: colors.teal,
      padding: 17,
      borderRadius: 16,
      alignItems: 'center',
      marginTop: 4,
      ...(shadows.glass as object),
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
    linkWrap: { alignItems: 'center', paddingVertical: 4 },
    linkText: { fontSize: 14, color: colors.textSecondary },
    linkAccent: { color: colors.teal, fontWeight: '700' },
  });
}
