import { Text, StyleSheet, Linking, Pressable, View } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { Ionicons } from '@expo/vector-icons';
import { parseAllergies, type EmergencyContact } from '@allerguide/core';
import { useAppStore } from '@/src/store/app-store';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { localizeEmergencyRelation } from '@/src/i18n/content';
import {
  getEmergencyNumber,
  getProfileAge,
  getSosActionPlan,
  getSosNotes,
  listEmergencyContacts,
} from '@/src/services/sos-service';

export default function SosScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, content } = useTranslation();
  const localeContent = content();
  const profile = useAppStore((s) => s.activeProfile);
  const allergies = profile ? parseAllergies(profile.allergies) : [];
  const [emergencyNumber, setEmergencyNumberState] = useState('103');
  const [notes, setNotes] = useState('');
  const [actionPlan, setActionPlan] = useState('');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);

  const refresh = useCallback(() => {
    setEmergencyNumberState(getEmergencyNumber());
    if (!profile) {
      setNotes('');
      setActionPlan('');
      setContacts([]);
      return;
    }
    setNotes(getSosNotes(profile.id));
    setActionPlan(getSosActionPlan(profile.id));
    setContacts(listEmergencyContacts(profile.id));
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const callPhone = (phone: string) => {
    void Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  };

  const planSteps = useMemo(
    () =>
      actionPlan
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean),
    [actionPlan],
  );

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={ui.docLabel}>AllerGuide · {t('sos.eyebrow')}</Text>
          <Text style={ui.docTitle}>{t('sos.title')}</Text>
          <Text style={ui.docMeta}>{t('sos.subtitle')}</Text>
        </View>
        <Button label={t('sos.edit')} variant="secondary" size="sm" onPress={() => router.push('/sos-edit' as any)} />
      </View>

      <ProfileSwitcher />

      {profile ? (
        <GlassCard>
          <View style={ui.kpiRow}>
            <Text style={ui.kpiLabel}>{t('sos.name')}</Text>
            <Text style={ui.kpiValue}>{profile.name}</Text>
          </View>
          {profile.birthYear ? (
            <View style={ui.kpiRow}>
              <Text style={ui.kpiLabel}>{t('sos.age')}</Text>
              <Text style={ui.kpiValue}>{getProfileAge(profile.birthYear)}</Text>
            </View>
          ) : null}
          {allergies.length > 0 ? (
            <View style={[ui.kpiRow, styles.allergyRow]}>
              <Text style={ui.kpiLabel}>{t('sos.allergies')}</Text>
              <View style={styles.allergyChips}>
                {allergies.map((allergen) => (
                  <View key={allergen} style={styles.allergyChip}>
                    <Text style={styles.allergyText}>{allergen}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {notes ? (
            <View style={styles.notesBlock}>
              <Text style={styles.notesLabel}>{t('sos.medicalNotes')}</Text>
              <Text style={styles.notesText}>{notes}</Text>
            </View>
          ) : null}
          {planSteps.length > 0 ? (
            <View style={styles.notesBlock}>
              <Text style={styles.notesLabel}>{t('sos.actionPlan')}</Text>
              {planSteps.map((step, index) => (
                <View key={`${index}-${step}`} style={styles.planStep}>
                  <Text style={styles.planNum}>{index + 1}</Text>
                  <Text style={styles.planText}>{step}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </GlassCard>
      ) : (
        <GlassCard>
          <Text style={styles.emptyText}>{t('sos.emptyProfile')}</Text>
        </GlassCard>
      )}

      {contacts.length > 0 ? (
        <GlassCard padded={false}>
          <Text style={[ui.cardTitle, styles.contactsHead]}>{t('sos.contactsTitle')}</Text>
          {contacts.map((contact, index) => (
            <View
              key={contact.id}
              style={[styles.contactRow, index < contacts.length - 1 && styles.contactRowBorder]}>
              <View style={styles.contactBody}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactMeta}>
                  {localizeEmergencyRelation(contact.relation, localeContent)} · {contact.phone}
                </Text>
              </View>
              <Button
                label={t('sos.callContact')}
                variant="primary"
                size="sm"
                onPress={() => callPhone(contact.phone)}
              />
            </View>
          ))}
        </GlassCard>
      ) : profile ? (
        <GlassCard>
          <Text style={styles.hintText}>{t('sos.contactsHint')}</Text>
        </GlassCard>
      ) : null}

      <Button
        label={t('sos.call', { number: emergencyNumber })}
        variant="danger"
        block
        onPress={() => void Linking.openURL(`tel:${emergencyNumber}`)}
      />

      <Pressable style={styles.settingsLink} onPress={() => router.push('/settings' as any)}>
        <Text style={styles.settingsLinkText}>{t('sos.settingsLink')}</Text>
      </Pressable>

      <View style={styles.tipCard}>
        <Ionicons name="information-circle-outline" size={18} color={theme.colors.info} />
        <Text style={styles.tipText}>{t('sos.tip')}</Text>
      </View>

      <Disclaimer>{t('sos.disclaimer')}</Disclaimer>
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerText: { flex: 1, gap: 2 },
    allergyRow: { flexDirection: 'column', alignItems: 'flex-start', gap: 8 },
    allergyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, width: '100%' },
    allergyChip: {
      backgroundColor: colors.dangerLight,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
    },
    allergyText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      color: colors.danger,
      fontWeight: '600',
    },
    notesBlock: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 6,
    },
    notesLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    notesText: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    planStep: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    planNum: {
      fontFamily: fonts.sansBold,
      fontSize: 14,
      fontWeight: '700',
      color: colors.head,
      width: 20,
    },
    planText: {
      fontFamily: fonts.sans,
      flex: 1,
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    emptyText: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      textAlign: 'center',
    },
    contactsHead: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    contactRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    contactBody: { flex: 1, gap: 2, minWidth: 0 },
    contactName: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    contactMeta: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textMuted,
    },
    hintText: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    settingsLink: { alignItems: 'center', paddingVertical: 4 },
    settingsLinkText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.accent,
    },
    tipCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: colors.infoLight,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tipText: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      flex: 1,
    },
  });
}
