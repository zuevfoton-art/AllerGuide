import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  cycleConfirmationSource,
  findAllergenById,
  type AllergyConfirmationSource,
} from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface AllergyConfirmationEditorProps {
  selected: string[];
  confirmations: Record<string, AllergyConfirmationSource>;
  onChange: (confirmations: Record<string, AllergyConfirmationSource>) => void;
}

export function AllergyConfirmationEditor({
  selected,
  confirmations,
  onChange,
}: AllergyConfirmationEditorProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();

  if (selected.length === 0) return null;

  const cycle = (allergenId: string) => {
    const current = confirmations[allergenId] ?? 'self_reported';
    onChange({ ...confirmations, [allergenId]: cycleConfirmationSource(current) });
  };

  const confirmationLabel = (source: AllergyConfirmationSource) => {
    if (source === 'specific_ige') return t('profileSetup.confirmationIge');
    if (source === 'clinician') return t('profileSetup.confirmationClinician');
    return t('profileSetup.confirmationSelf');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t('profileSetup.confirmationLabel')}</Text>
      <View style={styles.list}>
        {selected.map((allergenId) => {
          const source = confirmations[allergenId] ?? 'self_reported';
          const name = findAllergenById(allergenId)?.name ?? allergenId;
          return (
            <Pressable key={allergenId} style={styles.row} onPress={() => cycle(allergenId)}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.badge}>{confirmationLabel(source)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>{t('profileSetup.confirmationHint')}</Text>
    </View>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    label: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    list: { gap: 8 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    name: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.text,
    },
    badge: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.accent,
    },
    hint: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 16,
    },
  });
}
