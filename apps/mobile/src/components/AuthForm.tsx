import { useState, useMemo, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LoginType } from '@allerguide/core';
import { Button } from '@/src/components/Button';
import { BrandLogo } from '@/src/components/brand/BrandLogo';
import { radii, WEB_INPUT_FONT_SIZE } from '@/src/constants/layout';
import { fontSizes } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

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

export interface AuthFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  submitBehavior?: TextInputProps['submitBehavior'];
  textContentType?: TextInputProps['textContentType'];
  autoComplete?: TextInputProps['autoComplete'];
  autoCorrect?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

export const AuthField = forwardRef<TextInput, AuthFieldProps>(function AuthField(
  {
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    keyboardType = 'default',
    autoCapitalize = 'none',
    returnKeyType,
    onSubmitEditing,
    submitBehavior,
    textContentType,
    autoComplete,
    autoCorrect,
    accessibilityLabel,
    testID,
  },
  ref,
) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text>
      <TextInput
        ref={ref}
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        submitBehavior={submitBehavior}
        textContentType={textContentType}
        autoComplete={autoComplete}
        autoCorrect={autoCorrect}
        accessibilityLabel={accessibilityLabel ?? label}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, focused && styles.inputFocused]}
      />
    </View>
  );
});

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
  const { t } = useTranslation();

  return (
    <Button
      testID={testID}
      label={loading ? t('common.wait') : label}
      onPress={onPress}
      disabled={loading}
      block
      style={authPrimaryButtonStyle}
    />
  );
}

const authPrimaryButtonStyle = { marginTop: 8 };

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
    <Pressable testID={testID} style={styles.linkWrap} onPress={onPress} hitSlop={12}>
      <Text style={styles.linkText}>
        {text} <Text style={styles.linkAccent}>{linkText}</Text>
      </Text>
    </Pressable>
  );
}

export function AuthForgotLink({ text, onPress }: { text: string; onPress: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable style={styles.forgotWrap} onPress={onPress} hitSlop={12}>
      <Text style={styles.forgotText}>{text}</Text>
    </Pressable>
  );
}

export function AuthHero({ title, subtitle }: { title: string; subtitle: string }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  return (
    <View style={styles.hero}>
      <BrandLogo size={56} showWordmark showEndorser />
      <Text style={styles.heroTagline}>{t('brand.slogan')}</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
    </View>
  );
}

export function AuthError({ message }: { message: string }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (!message) return null;
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function AuthDivider() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerLabel}>or</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

export function AuthReplitButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable style={styles.replitBtn} onPress={onPress}>
      <Ionicons name="code-slash-outline" size={18} color={theme.colors.text} />
      <Text style={styles.replitText}>Sign in with Replit</Text>
    </Pressable>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    hero: { alignItems: 'center', paddingVertical: 12, gap: 6 },
    heroTagline: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm + 1,
      fontWeight: '600',
      color: colors.accent,
      letterSpacing: 0.2,
      marginBottom: 4,
    },
    heroTitle: {
      fontFamily: fonts.serifBold,
      fontSize: fontSizes.h2,
      fontWeight: '700',
      color: colors.head,
      letterSpacing: -0.3,
      textAlign: 'center',
    },
    heroSubtitle: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm + 1,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginTop: 4,
    },
    toggleRow: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
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
      minHeight: 44,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    toggleBtnLast: {
      borderRightWidth: 0,
    },
    toggleActive: { backgroundColor: colors.accent },
    toggleText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.bodySm + 1,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    toggleTextActive: { color: colors.onAccent, fontWeight: '600' },
    fieldWrap: { gap: 6 },
    label: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.label,
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
      minHeight: 44,
      borderRadius: radii.md,
      fontSize: WEB_INPUT_FONT_SIZE,
      fontFamily: fonts.sans,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    inputFocused: {
      borderColor: colors.accent,
      borderWidth: 1.5,
    },
    linkWrap: { alignItems: 'center', paddingVertical: 4 },
    linkText: { fontFamily: fonts.sans, fontSize: fontSizes.bodySm + 1, color: colors.textSecondary },
    linkAccent: { fontFamily: fonts.sansSemiBold, color: colors.accent, fontWeight: '600' },
    forgotWrap: { alignItems: 'flex-end', marginTop: -4 },
    forgotText: { fontFamily: fonts.sans, fontSize: fontSizes.bodySm, color: colors.accent },
    errorBox: {
      backgroundColor: colors.dangerLight,
      borderRadius: radii.md,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    errorText: {
      color: colors.danger,
      fontSize: fontSizes.bodySm + 1,
      textAlign: 'center',
      fontFamily: fonts.sans,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginVertical: 4,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerLabel: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.label,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    replitBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      padding: 14,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.card,
      minHeight: 44,
    },
    replitText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.body,
      fontWeight: '600',
      color: colors.text,
    },
  });
}
