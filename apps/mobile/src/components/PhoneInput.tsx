import { useMemo, useState, forwardRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  DEFAULT_PHONE_COUNTRY_ISO2,
  PHONE_COUNTRIES,
  formatNationalNumber,
  formatPhoneDisplay,
  getPhoneCountry,
  parsePhone,
  toE164,
  type PhoneCountry,
} from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { radii, WEB_INPUT_FONT_SIZE } from '@/src/constants/layout';
import { fontSizes } from '@/src/constants/typography';

export interface PhoneInputProps {
  label?: string;
  value: string;
  onChangeText: (e164OrDisplay: string) => void;
  /** When true, onChangeText receives E.164; otherwise formatted display string. */
  emitE164?: boolean;
  placeholder?: string;
  testID?: string;
  defaultCountryIso2?: string;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  submitBehavior?: TextInputProps['submitBehavior'];
  textContentType?: TextInputProps['textContentType'];
  autoComplete?: TextInputProps['autoComplete'];
  autoCorrect?: boolean;
  accessibilityLabel?: string;
}

export const PhoneInput = forwardRef<TextInput, PhoneInputProps>(function PhoneInput(
  {
    label,
    value,
    onChangeText,
    emitE164 = true,
    placeholder,
    testID,
    defaultCountryIso2 = DEFAULT_PHONE_COUNTRY_ISO2,
    returnKeyType,
    onSubmitEditing,
    submitBehavior,
    textContentType,
    autoComplete,
    autoCorrect,
    accessibilityLabel,
  },
  ref,
) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  const parsed = useMemo(() => parsePhone(value, defaultCountryIso2), [value, defaultCountryIso2]);
  const country = getPhoneCountry(parsed.countryIso2);

  const applyNational = (nationalRaw: string, nextCountry: PhoneCountry = country) => {
    const digits = nationalRaw.replace(/\D/g, '').slice(0, nextCountry.nationalMax);
    const e164 = toE164(nextCountry.dialCode, digits);
    const display = formatPhoneDisplay(nextCountry.dialCode, digits, nextCountry.iso2);
    onChangeText(emitE164 ? e164 : display);
  };

  const selectCountry = (next: PhoneCountry) => {
    setPickerOpen(false);
    applyNational(parsed.nationalDigits, next);
  };

  const displayValue = formatPhoneDisplay(country.dialCode, parsed.nationalDigits, country.iso2);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, focused && styles.labelFocused]}>{label}</Text> : null}
      <View style={[styles.row, focused && styles.rowFocused]}>
        <Pressable
          testID={testID ? `${testID}-country` : undefined}
          style={styles.countryBtn}
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('auth.countryCode')}>
          <Text style={styles.dialCode}>+{country.dialCode}</Text>
          <Ionicons name="chevron-down" size={14} color={theme.colors.textSecondary} />
        </Pressable>
        <TextInput
          ref={ref}
          testID={testID}
          style={styles.input}
          value={parsed.nationalDigits ? formatNationalNumber(parsed.nationalDigits, country.iso2) : ''}
          onChangeText={(text) => applyNational(text)}
          placeholder={placeholder ?? formatNationalNumber('9991234567', country.iso2)}
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="phone-pad"
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          submitBehavior={submitBehavior}
          textContentType={textContentType}
          autoComplete={autoComplete}
          autoCorrect={autoCorrect}
          accessibilityLabel={accessibilityLabel ?? label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {displayValue && parsed.nationalDigits ? (
        <Text style={styles.hint}>{displayValue}</Text>
      ) : null}

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('auth.countryCodeTitle')}</Text>
            <ScrollView style={styles.modalList}>
              {PHONE_COUNTRIES.map((item) => {
                const active = item.iso2 === country.iso2;
                return (
                  <Pressable
                    key={`${item.iso2}-${item.dialCode}`}
                    style={[styles.countryRow, active && styles.countryRowActive]}
                    onPress={() => selectCountry(item)}>
                    <Text style={[styles.countryName, active && styles.countryNameActive]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.countryDial, active && styles.countryNameActive]}>
                      +{item.dialCode}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
});

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    label: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.bodySm,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    labelFocused: { color: colors.accent },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      backgroundColor: colors.card,
      overflow: 'hidden',
      minHeight: 44,
    },
    rowFocused: { borderColor: colors.accent },
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
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      maxHeight: '70%',
      padding: 16,
      gap: 8,
    },
    modalTitle: {
      fontFamily: fonts.sans,
      fontSize: fontSizes.body,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    modalList: { maxHeight: 360 },
    countryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: radii.md,
    },
    countryRowActive: { backgroundColor: `${colors.accent}18` },
    countryName: { fontFamily: fonts.sans, fontSize: fontSizes.body, color: colors.text },
    countryNameActive: { color: colors.accent, fontWeight: '600' },
    countryDial: { fontFamily: fonts.sans, fontSize: fontSizes.body, color: colors.textSecondary },
  });
}
