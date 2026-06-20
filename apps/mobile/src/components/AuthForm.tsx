import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { colors, shadows } from '@/src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { LoginType } from '@allerguide/core';

interface AuthModeToggleProps {
  loginType: LoginType;
  onChange: (type: LoginType) => void;
}

export function AuthModeToggle({ loginType, onChange }: AuthModeToggleProps) {
  return (
    <View style={styles.toggleRow}>
      <Pressable
        style={[styles.toggleBtn, loginType === 'phone' && styles.toggleActive]}
        onPress={() => onChange('phone')}>
        <Ionicons name="call" size={16} color={loginType === 'phone' ? colors.accent : colors.textSecondary} />
        <Text style={[styles.toggleText, loginType === 'phone' && styles.toggleTextActive]}>Телефон</Text>
      </Pressable>
      <Pressable
        style={[styles.toggleBtn, loginType === 'email' && styles.toggleActive]}
        onPress={() => onChange('email')}>
        <Ionicons name="mail" size={16} color={loginType === 'email' ? colors.accent : colors.textSecondary} />
        <Text style={[styles.toggleText, loginType === 'email' && styles.toggleTextActive]}>Email</Text>
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
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
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
  return (
    <Pressable
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading}>
      <Text style={styles.buttonText}>{loading ? 'Подождите...' : label}</Text>
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
  return (
    <Pressable style={styles.linkWrap} onPress={onPress}>
      <Text style={styles.linkText}>
        {text} <Text style={styles.linkAccent}>{linkText}</Text>
      </Text>
    </Pressable>
  );
}

export function AuthHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.hero}>
      <View style={styles.logoWrap}>
        <Ionicons name="leaf" size={32} color="#fff" />
      </View>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
    </View>
  );
}

export const authStyles = StyleSheet.create({
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
});

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: 12, gap: 8 },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...(shadows.accentLg as object),
  },
  heroTitle: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
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
  toggleActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  toggleText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  toggleTextActive: { color: colors.accent },
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
    backgroundColor: colors.accent,
    padding: 17,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
    ...(shadows.accent as object),
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  linkWrap: { alignItems: 'center', paddingVertical: 4 },
  linkText: { fontSize: 14, color: colors.textSecondary },
  linkAccent: { color: colors.accent, fontWeight: '700' },
});
