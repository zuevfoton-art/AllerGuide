import { useState, useRef, useMemo } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LoginType } from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { AppLogoMark } from '@/src/components/AppLogo';

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
        testID="auth-mode-phone"
        style={[styles.toggleBtn, loginType === 'phone' && styles.toggleActive]}
        onPress={() => onChange('phone')}>
        <Ionicons
          name="call"
          size={16}
          color={loginType === 'phone' ? theme.colors.onAccent : theme.colors.textSecondary}
        />
        <Text style={[styles.toggleText, loginType === 'phone' && styles.toggleTextActive]}>{t('common.phone')}</Text>
      </Pressable>
      <Pressable
        testID="auth-mode-email"
        style={[styles.toggleBtn, styles.toggleBtnLast, loginType === 'email' && styles.toggleActive]}
        onPress={() => onChange('email')}>
        <Ionicons
          name="mail"
          size={16}
          color={loginType === 'email' ? theme.colors.onAccent : theme.colors.textSecondary}
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
  testID?: string;
}

export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  testID,
}: AuthFieldProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, focused && styles.inputFocused]}
      />
    </View>
  );
}

export function AuthPrimaryButton({
  label,
  onPress,
  loading,
  testID,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }).start();
  };

  return (
    <Pressable
      testID={testID}
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={loading}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Text style={styles.buttonText}>{loading ? t('common.wait') : label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function AuthLink({
  text,
  linkText,
  onPress,
  testID,
}: {
  text: string;
  linkText: string;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable testID={testID} style={styles.linkWrap} onPress={onPress}>
      <Text style={styles.linkText}>
        {text} <Text style={styles.linkAccent}>{linkText}</Text>
      </Text>
    </Pressable>
  );
}

export function AuthForgotLink({
  text,
  onPress,
  testID,
}: {
  text: string;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable testID={testID} style={styles.forgotWrap} onPress={onPress} accessibilityRole="link">
      <Text style={styles.forgotText}>{text}</Text>
    </Pressable>
  );
}

export function AuthHero({ title, subtitle }: { title: string; subtitle: string }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.hero}>
      <AppLogoMark size={72} />
      <View style={styles.heroWordmark}>
        <Text style={styles.heroTitle}>
          <Text>Aller</Text>
          <Text style={{ color: theme.colors.accent }}>Guide</Text>
        </Text>
        <Text style={styles.heroTagline}>ALLERGY MANAGEMENT</Text>
      </View>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
    </View>
  );
}

export function AuthError({ message }: { message: string }) {
  const theme = useTheme();
  if (!message) return null;
  return (
    <View style={{ backgroundColor: theme.colors.dangerLight, borderRadius: 6, padding: 10, borderWidth: 1, borderColor: theme.colors.dangerBorder }}>
      <Text style={{ color: theme.colors.danger, fontSize: 14, textAlign: 'center', fontFamily: undefined }}>{message}</Text>
    </View>
  );
}

export function AuthDivider() {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
      <Text style={{ fontFamily: theme.fonts.sans, fontSize: 12, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>or</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
    </View>
  );
}

export function AuthReplitButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      style={{
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 6,
        padding: 14,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.colors.card,
        minHeight: 48,
      }}
      onPress={onPress}>
      <Ionicons name="code-slash-outline" size={18} color={theme.colors.text} />
      <Text style={{ fontFamily: theme.fonts.sansSemiBold, fontSize: 16, fontWeight: '600', color: theme.colors.text }}>
        Sign in with Replit
      </Text>
    </Pressable>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    hero: { alignItems: 'center', paddingVertical: 12, gap: 6 },
    heroWordmark: { alignItems: 'center', gap: 2, marginTop: 2 },
    heroTitle: {
      fontFamily: fonts.serifBold,
      fontSize: 28,
      fontWeight: '700',
      color: colors.head,
      letterSpacing: -0.3,
    },
    heroTagline: {
      fontFamily: fonts.sans,
      fontSize: 10,
      color: colors.textMuted,
      letterSpacing: 1.8,
      textTransform: 'uppercase',
    },
    heroSubtitle: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginTop: 4,
    },
    toggleRow: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      overflow: 'hidden',
    },
    toggleBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.card,
      padding: 12,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    toggleBtnLast: {
      borderRightWidth: 0,
    },
    toggleActive: { backgroundColor: colors.accent },
    toggleText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    toggleTextActive: { color: colors.onAccent, fontWeight: '600' },
    fieldWrap: { gap: 6 },
    label: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    labelFocused: {
      color: colors.accent,
    },
    input: {
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 6,
      fontSize: 16,
      fontFamily: fonts.sans,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    inputFocused: {
      borderColor: colors.accent,
      borderWidth: 1.5,
    },
    button: {
      backgroundColor: colors.accent,
      padding: 14,
      borderRadius: 6,
      alignItems: 'center',
      marginTop: 8,
      minHeight: 48,
      justifyContent: 'center',
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: {
      fontFamily: fonts.sansSemiBold,
      color: colors.onAccent,
      fontWeight: '600',
      fontSize: 16,
    },
    linkWrap: { alignItems: 'center', paddingVertical: 4 },
    linkText: { fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary },
    linkAccent: { fontFamily: fonts.sansSemiBold, color: colors.accent, fontWeight: '600' },
    forgotWrap: { alignItems: 'flex-end', marginTop: -4 },
    forgotText: { fontFamily: fonts.sans, fontSize: 13, color: colors.accent },
  });
}
