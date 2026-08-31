import { useMemo, useState, forwardRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  DEFAULT_PHONE_COUNTRY_ISO2,
  applyLoginFieldCountry,
  applyLoginFieldInput,
  digitsOnly,
  formatNationalNumber,
  formatPhoneDisplay,
  getPhoneCountry,
  type LoginFieldKind,
  type LoginType,
} from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { radii, WEB_INPUT_FONT_SIZE } from '@/src/constants/layout';
import { fontSizes } from '@/src/constants/typography';
import { authLoginInputProps } from '@/src/constants/auth-input-props';
import { PhoneCountryPicker } from '@/src/components/PhoneCountryPicker';

export interface LoginFieldChange {
  canonical: string;
  loginType: LoginType;
}

export interface LoginFieldProps {
  label?: string;
  /** Display or canonical identifier; the field keeps the visible text in sync. */
  value: string;
  onChangeText: (next: string) => void;
  onResolvedChange?: (next: LoginFieldChange) => void;
  placeholder?: string;
  testID?: string;
  defaultCountryIso2?: string;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  submitBehavior?: TextInputProps['submitBehavior'];
  accessibilityLabel?: string;
}

export const LoginField = forwardRef<TextInput, LoginFieldProps>(function LoginField(
  {
    label,
    value,
    onChangeText,
    onResolvedChange,
    placeholder,
    testID,
    defaultCountryIso2 = DEFAULT_PHONE_COUNTRY_ISO2,
    returnKeyType,
    onSubmitEditing,
    submitBehavior,
    accessibilityLabel,
  },
  ref,
) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [countryIso2, setCountryIso2] = useState(defaultCountryIso2);

  const resolved = useMemo(
    () => applyLoginFieldInput(value, countryIso2),
    [value, countryIso2],
  );
  const kind: LoginFieldKind = resolved.kind;
  const isPhone = kind === 'phone';
  const country = getPhoneCountry(isPhone ? resolved.countryIso2 : countryIso2);
  const autofill = authLoginInputProps(kind);
  const inputValue = isPhone ? resolved.display : value;
  const nationalDigits = isPhone ? digitsOnly(resolved.display) : '';
  const preview =
    isPhone && nationalDigits
      ? formatPhoneDisplay(country.dialCode, nationalDigits, country.iso2)
      : '';
  const resolvedPlaceholder =
    placeholder ??
    (isPhone
      ? formatNationalNumber('9991234567', country.iso2)
      : t('auth.forgot.emailPlaceholder'));

  const emit = (raw: string, nextCountryIso2: string = countryIso2) => {
    const next = applyLoginFieldInput(raw, nextCountryIso2);
    if (next.kind === 'phone') {
      setCountryIso2(next.countryIso2);
      onChangeText(next.canonical);
    } else {
      onChangeText(next.display);
    }
    onResolvedChange?.({ canonical: next.canonical, loginType: next.loginType });
  };

  const selectCountry = (nextIso2: string) => {
    setPickerOpen(false);
    const next = applyLoginFieldCountry(resolved, nextIso2);
    setCountryIso2(next.countryIso2);
    onChangeText(next.canonical);
    onResolvedChange?.({ canonical: next.canonical, loginType: next.loginType });
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text> : null}
      <View style={[styles.row, focused && styles.rowFocused]}>
        {isPhone ? (
          <Pressable
            testID={testID ? `${testID}-country` : undefined}
            style={styles.countryBtn}
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('auth.countryCode')}>
            <Text style={styles.dialCode}>+{country.dialCode}</Text>
            <Ionicons name="chevron-down" size={14} color={theme.colors.textSecondary} />
          </Pressable>
        ) : null}
        <TextInput
          ref={ref}
          testID={testID}
          style={styles.input}
          value={inputValue}
          onChangeText={(text) => emit(text, country.iso2)}
          placeholder={resolvedPlaceholder}
          placeholderTextColor={theme.colors.textMuted}
          keyboardType={autofill.keyboardType}
          autoCapitalize={autofill.autoCapitalize}
          autoCorrect={autofill.autoCorrect}
          textContentType={autofill.textContentType}
          autoComplete={autofill.autoComplete}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          submitBehavior={submitBehavior}
          accessibilityLabel={accessibilityLabel ?? label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {preview ? <Text style={styles.hint}>{preview}</Text> : null}

      <PhoneCountryPicker
        visible={pickerOpen}
        selectedIso2={country.iso2}
        onSelect={(next) => selectCountry(next.iso2)}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
});

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    label: {
      fontFamily: fonts.sansSemiBold,
      fontSize: fontSizes.label,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    labelFocused: { color: colors.accent },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.borderInput,
      borderRadius: radii.md,
      backgroundColor: colors.card,
      overflow: 'hidden',
      minHeight: 44,
    },
    rowFocused: { borderColor: colors.accent, borderWidth: 1.5 },
    countryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    dialCode: {
      fontFamily: fonts.sans,
      fontSize: WEB_INPUT_FONT_SIZE,
      color: colors.text,
      fontWeight: '600',
    },
    input: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: WEB_INPUT_FONT_SIZE,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 14,
    },
    hint: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.label,
      color: colors.textMuted,
    },
  });
}
