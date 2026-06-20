import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  EMERGENCY_CONTACT_RELATIONS,
  type EmergencyContactRelation,
} from '@allerguide/core';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { WEB_INPUT_FONT_SIZE } from '@/src/constants/layout';
import {
  DEFAULT_EMERGENCY_CONTACT_RELATION,
  type EmergencyContactDraft,
} from '@/src/services/emergency-contact-service';
import { useTranslation } from '@/src/store/locale-store';
import { localizeEmergencyRelation } from '@/src/i18n/content';

interface EmergencyContactsEditorProps {
  contacts: EmergencyContactDraft[];
  onChange: (contacts: EmergencyContactDraft[]) => void;
}

function createEmptyContact(): EmergencyContactDraft {
  return {
    name: '',
    phone: '',
    relation: DEFAULT_EMERGENCY_CONTACT_RELATION,
  };
}

export function EmergencyContactsEditor({ contacts, onChange }: EmergencyContactsEditorProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, content } = useTranslation();
  const localeContent = content();

  const updateContact = (index: number, patch: Partial<EmergencyContactDraft>) => {
    onChange(contacts.map((contact, i) => (i === index ? { ...contact, ...patch } : contact)));
  };

  const removeContact = (index: number) => {
    onChange(contacts.filter((_, i) => i !== index));
  };

  const addContact = () => {
    onChange([...contacts, createEmptyContact()]);
  };

  return (
    <View style={styles.wrap}>
      {contacts.length === 0 ? (
        <Text style={styles.emptyText}>{t('emergencyContacts.empty')}</Text>
      ) : null}

      {contacts.map((contact, index) => (
        <View key={contact.id ?? `draft-${index}`} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('emergencyContacts.contactN', { n: index + 1 })}</Text>
            <Pressable onPress={() => removeContact(index)} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>{t('emergencyContacts.nameLabel')}</Text>
          <TextInput
            style={styles.input}
            value={contact.name}
            onChangeText={(name) => updateContact(index, { name })}
            placeholder={t('emergencyContacts.namePlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
          />

          <Text style={styles.fieldLabel}>{t('emergencyContacts.phoneLabel')}</Text>
          <TextInput
            style={styles.input}
            value={contact.phone}
            onChangeText={(phone) => updateContact(index, { phone })}
            placeholder="+7 900 000-00-00"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>{t('emergencyContacts.relationLabel')}</Text>
          <View style={styles.relationRow}>
            {EMERGENCY_CONTACT_RELATIONS.map((option) => {
              const active = contact.relation === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={[styles.relationChip, active && styles.relationChipActive]}
                  onPress={() =>
                    updateContact(index, { relation: option.key as EmergencyContactRelation })
                  }>
                  <Text style={[styles.relationText, active && styles.relationTextActive]}>
                    {localizeEmergencyRelation(option.key, localeContent)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <Pressable style={styles.addBtn} onPress={addContact}>
        <Ionicons name="person-add" size={16} color={theme.colors.accent} />
        <Text style={styles.addBtnText}>{t('emergencyContacts.addContact')}</Text>
      </Pressable>
    </View>
  );
}

function createStyles({ colors }: AppTheme) {
  return StyleSheet.create({
    wrap: { gap: 12 },
    emptyText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 2,
    },
    input: {
      backgroundColor: colors.bg,
      padding: 12,
      borderRadius: 12,
      fontSize: Platform.OS === 'web' ? WEB_INPUT_FONT_SIZE : 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    relationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    relationChip: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.bg,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    relationChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    relationText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    relationTextActive: { color: colors.accent },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.accentLight,
      borderWidth: 1.5,
      borderColor: colors.accentMid,
    },
    addBtnText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  });
}
