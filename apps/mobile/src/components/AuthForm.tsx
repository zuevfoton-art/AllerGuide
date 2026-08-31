import { useState, useMemo, forwardRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { Button } from '@/src/components/Button';
import { BrandLogo } from '@/src/components/brand/BrandLogo';
import { radii, WEB_INPUT_FONT_SIZE } from '@/src/constants/layout';
import { fontSizes } from '@/src/constants/typography';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

export interface AuthFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
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
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${text} ${linkText}`}
      style={styles.linkWrap}
      onPress={onPress}
      hitSlop={12}>
      <Text testID={testID} style={styles.linkText}>
        {text}{' '}
        <Text style={styles.linkAccent}>{linkText}</Text>
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

export function AuthHero({ title, subtitle }: { title: string; subtitle?: string }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.hero} testID="auth-hero">
      <BrandLogo size={56} showWordmark />
      <Text style={styles.heroTitle} testID="auth-hero-title">
        {title}
      </Text>
      {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
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

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    hero: { alignItems: 'center', paddingVertical: 12, gap: 6 },
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
  });
}
