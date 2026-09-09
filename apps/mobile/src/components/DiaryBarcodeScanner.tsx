import { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { isValidBarcode, normalizeBarcode } from '@allerguide/core';
import { Button } from '@/src/components/Button';
import { BarcodeScanCamera } from '@/src/components/BarcodeScanCamera';
import { density, radii, WEB_INPUT_FONT_SIZE } from '@/src/constants/layout';
import { isManualBarcodeInput } from '@/src/constants/scanner-mode';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

type Props = {
  testID: string;
  disabled?: boolean;
  onBarcode: (barcode: string) => void;
};

function usableBarcode(raw: string): string {
  const barcode = normalizeBarcode(raw);
  if (!isValidBarcode(barcode)) return '';
  if (!isManualBarcodeInput(barcode)) return '';
  return barcode;
}

/**
 * Scanner-style barcode entry for diary capture steps.
 * Native: live camera. Web: digits field (camera barcode is unavailable).
 */
export function DiaryBarcodeScanner({ testID, disabled, onBarcode }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [digits, setDigits] = useState('');

  const emit = (raw: string) => {
    const barcode = usableBarcode(raw);
    if (!barcode) return;
    setDigits('');
    setManualOpen(false);
    setCameraOpen(false);
    onBarcode(barcode);
  };

  return (
    <View style={styles.wrap}>
      <Button
        testID={testID}
        label={t('scanner.scanBarcode')}
        variant="secondary"
        icon="barcode-outline"
        disabled={disabled}
        onPress={() => {
          if (Platform.OS === 'web') {
            setManualOpen(true);
            return;
          }
          setCameraOpen(true);
        }}
      />
      {manualOpen ? (
        <View style={styles.manual} testID={`${testID}-manual`}>
          <Text style={styles.hint}>{t('scanner.barcodeWebHint')}</Text>
          <TextInput
            testID={`${testID}-input`}
            style={styles.input}
            value={digits}
            onChangeText={setDigits}
            placeholder={t('scanner.barcodePlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="number-pad"
            autoCorrect={false}
            accessibilityLabel={t('scanner.scanBarcode')}
          />
          <Button
            testID={`${testID}-lookup`}
            label={t('scanner.check')}
            disabled={!usableBarcode(digits)}
            onPress={() => emit(digits)}
          />
        </View>
      ) : null}
      <BarcodeScanCamera
        visible={cameraOpen}
        onCancel={() => setCameraOpen(false)}
        onScan={emit}
      />
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 10 },
    manual: { gap: 10 },
    hint: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: density.tapMinHeight,
      fontSize: Platform.OS === 'web' ? WEB_INPUT_FONT_SIZE : 15,
      fontFamily: fonts.sans,
      color: colors.text,
    },
  });
}
