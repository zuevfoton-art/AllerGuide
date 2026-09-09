import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PHONE_COUNTRIES, type PhoneCountry } from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { radii } from '@/src/constants/layout';
import { fontSizes } from '@/src/constants/typography';

export interface PhoneCountryPickerProps {
  visible: boolean;
  selectedIso2: string;
  onSelect: (country: PhoneCountry) => void;
  onClose: () => void;
}

export function PhoneCountryPicker({
  visible,
  selectedIso2,
  onSelect,
  onClose,
}: PhoneCountryPickerProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{t('auth.countryCodeTitle')}</Text>
          <ScrollView style={styles.modalList}>
            {PHONE_COUNTRIES.map((item) => {
              const active = item.iso2 === selectedIso2;
              return (
                <Pressable
                  key={`${item.iso2}-${item.dialCode}`}
                  style={[styles.countryRow, active && styles.countryRowActive]}
                  onPress={() => onSelect(item)}>
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
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
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
