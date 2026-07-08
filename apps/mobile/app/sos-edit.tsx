import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import {
  DEFAULT_SHOCK_KIT,
  type AllergyPassport,
  type EmergencyContact,
  type EmergencyContactRelation,
  type ShockKitItem,
} from '@allerguide/core';
import { useAppStore } from '@/src/store/app-store';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { localizeEmergencyRelation } from '@/src/i18n/content';
import {
  addEmergencyContact,
  deleteEmergencyContact,
  getSosNotes,
  listEmergencyContacts,
  saveSosNotes,
  getSosActionPlan,
  saveSosActionPlan,
} from '@/src/services/sos-service';
import {
  getAllergyPassport,
  saveAllergyPassport,
} from '@/src/services/sos-passport-service';

function parseListInput(value: string): string[] {
  return value
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatListInput(items: string[]): string {
  return items.join(', ');
}

export default function SosEditScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, tSosError, content } = useTranslation();
  const localeContent = content();
  const profile = useAppStore((s) => s.activeProfile);
  const [notes, setNotes] = useState('');
  const [plan, setPlan] = useState('');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [passport, setPassport] = useState<AllergyPassport | null>(null);
  const [drugIntolerances, setDrugIntolerances] = useState('');
  const [triggers, setTriggers] = useState('');
  const [epiBrand, setEpiBrand] = useState('');
  const [epiExpiry, setEpiExpiry] = useState('');
  const [epiLocation, setEpiLocation] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [anaphylaxisHistory, setAnaphylaxisHistory] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState<EmergencyContactRelation>('relative');
  const [error, setError] = useState('');
  const [passportOpen, setPassportOpen] = useState(false);

  const refresh = useCallback(() => {
    if (!profile) {
      setNotes('');
      setPlan('');
      setContacts([]);
      setPassport(null);
      return;
    }
    setNotes(getSosNotes(profile.id));
    setPlan(getSosActionPlan(profile.id));
    setContacts(listEmergencyContacts(profile.id));
    const p = getAllergyPassport(profile.id);
    setPassport(p);
    setDrugIntolerances(formatListInput(p.drugIntolerances));
    setTriggers(formatListInput(p.triggers));
    setEpiBrand(p.epinephrine?.brand ?? '');
    setEpiExpiry(p.epinephrine?.expiry ?? '');
    setEpiLocation(p.epinephrine?.location ?? '');
    setDoctorName(p.doctorName ?? '');
    setDoctorPhone(p.doctorPhone ?? '');
    setAnaphylaxisHistory(Boolean(p.anaphylaxisHistory));
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const saveNotes = () => {
    if (!profile) {
      setError(t('errors.selectProfile'));
      return;
    }
    saveSosNotes(profile.id, notes);
    setError('');
    Alert.alert(t('settings.saved'), t('sosEdit.savedNotes'));
  };

  const savePlan = () => {
    if (!profile) {
      setError(t('errors.selectProfile'));
      return;
    }
    saveSosActionPlan(profile.id, plan);
    setError('');
    Alert.alert(t('settings.saved'), t('sosEdit.savedPlan'));
  };

  const savePassport = () => {
    if (!profile || !passport) {
      setError(t('errors.selectProfile'));
      return;
    }
    const next: AllergyPassport = {
      ...passport,
      drugIntolerances: parseListInput(drugIntolerances),
      triggers: parseListInput(triggers),
      epinephrine: {
        brand: epiBrand.trim() || undefined,
        expiry: epiExpiry.trim() || undefined,
        location: epiLocation.trim() || undefined,
      },
      doctorName: doctorName.trim() || undefined,
      doctorPhone: doctorPhone.trim() || undefined,
      anaphylaxisHistory,
    };
    saveAllergyPassport(profile.id, next);
    setPassport(next);
    setError('');
    Alert.alert(t('settings.saved'), t('sosEdit.savedPassport'));
  };

  const toggleKitItem = (id: string) => {
    if (!passport) return;
    const shockKit = passport.shockKit.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item,
    );
    const next = { ...passport, shockKit };
    setPassport(next);
    if (profile) saveAllergyPassport(profile.id, next);
  };

  const addContact = () => {
    if (!profile) {
      setError(t('errors.selectProfile'));
      return;
    }
    if (!name.trim() || !phone.trim()) {
      setError(t('sosEdit.errors.contactRequired'));
      return;
    }

    addEmergencyContact({
      profileId: profile.id,
      name: name.trim(),
      phone: phone.trim(),
      relation,
    });
    setName('');
    setPhone('');
    setRelation('relative');
    setError('');
    refresh();
  };

  const removeContact = (id: number) => {
    deleteEmergencyContact(id);
    refresh();
  };

  const kitItems = passport?.shockKit ?? DEFAULT_SHOCK_KIT;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <ScreenEyebrow section={t('sosEdit.eyebrow')} />
          <Text style={ui.docTitle}>{t('sosEdit.title')}</Text>
          <Text style={ui.docMeta}>{profile ? profile.name : t('sosEdit.noProfile')}</Text>
        </View>
      </View>

      <Pressable style={styles.collapseHead} onPress={() => setPassportOpen((v) => !v)}>
        <Text style={ui.sectionLabel}>{t('sosEdit.passportLabel')}</Text>
        <Ionicons name={passportOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.textMuted} />
      </Pressable>

      {passportOpen ? (
        <GlassCard style={styles.section}>
          <TextInput
            style={styles.input}
            value={drugIntolerances}
            onChangeText={setDrugIntolerances}
            placeholder={t('sosEdit.drugIntolerancesPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={triggers}
            onChangeText={setTriggers}
            placeholder={t('sosEdit.triggersPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={epiBrand}
            onChangeText={setEpiBrand}
            placeholder={t('sosEdit.epiBrandPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={epiExpiry}
            onChangeText={setEpiExpiry}
            placeholder={t('sosEdit.epiExpiryPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={epiLocation}
            onChangeText={setEpiLocation}
            placeholder={t('sosEdit.epiLocationPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={doctorName}
            onChangeText={setDoctorName}
            placeholder={t('sosEdit.doctorNamePlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
          />
          <TextInput
            style={styles.input}
            value={doctorPhone}
            onChangeText={setDoctorPhone}
            placeholder={t('sosEdit.doctorPhonePlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="phone-pad"
          />
          <Pressable style={styles.checkRow} onPress={() => setAnaphylaxisHistory((v) => !v)}>
            <Ionicons
              name={anaphylaxisHistory ? 'checkbox' : 'square-outline'}
              size={20}
              color={theme.colors.accent}
            />
            <Text style={styles.checkLabel}>{t('sosEdit.anaphylaxisHistory')}</Text>
          </Pressable>
          <Text style={styles.subLabel}>{t('sosEdit.shockKitLabel')}</Text>
          {kitItems.map((item: ShockKitItem) => (
            <Pressable key={item.id} style={styles.checkRow} onPress={() => toggleKitItem(item.id)}>
              <Ionicons
                name={item.checked ? 'checkbox' : 'square-outline'}
                size={20}
                color={theme.colors.accent}
              />
              <Text style={styles.checkLabel}>{item.label}</Text>
            </Pressable>
          ))}
          <Button label={t('sosEdit.savePassport')} variant="primary" block onPress={savePassport} />
        </GlassCard>
      ) : null}

      <Text style={ui.sectionLabel}>{t('sosEdit.notesLabel')}</Text>
      <GlassCard style={styles.section}>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('sosEdit.notesPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
        />
        <Button label={t('sosEdit.saveNotes')} variant="primary" block onPress={saveNotes} />
      </GlassCard>

      <Text style={ui.sectionLabel}>{t('sosEdit.planLabel')}</Text>
      <GlassCard style={styles.section}>
        <TextInput
          style={styles.notesInput}
          value={plan}
          onChangeText={setPlan}
          placeholder={t('sosEdit.planPlaceholder')}
          placeholderTextColor={theme.colors.textMuted}
          multiline
        />
        <Button label={t('sosEdit.savePlan')} variant="primary" block onPress={savePlan} />
      </GlassCard>

      <Text style={ui.sectionLabel}>{t('sosEdit.contactsLabel')}</Text>

      {contacts.map((contact) => (
        <GlassCard key={contact.id} style={styles.contactCard}>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactMeta}>
              {localizeEmergencyRelation(contact.relation, localeContent)} · {contact.phone}
            </Text>
          </View>
          <Pressable onPress={() => removeContact(contact.id)} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
          </Pressable>
        </GlassCard>
      ))}

      <GlassCard style={styles.section}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder={t('common.name')}
          placeholderTextColor={theme.colors.textMuted}
        />
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder={t('common.phone')}
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.input}
          value={relation}
          onChangeText={(value) => setRelation(value as EmergencyContactRelation)}
          placeholder="relative / trusted / doctor"
          placeholderTextColor={theme.colors.textMuted}
        />
        <Button
          label={t('sosEdit.addContact')}
          variant="secondary"
          block
          onPress={addContact}
        />
      </GlassCard>

      {error ? <Text style={styles.error}>{tSosError(error)}</Text> : null}
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 6,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 2,
    },
    headerText: { flex: 1, gap: 2 },
    collapseHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    section: { gap: 10 },
    notesInput: {
      minHeight: 120,
      backgroundColor: colors.card,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderInput,
      padding: 14,
      fontSize: 15,
      fontFamily: fonts.sans,
      color: colors.text,
      textAlignVertical: 'top',
    },
    contactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    contactInfo: { flex: 1, gap: 2 },
    contactName: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    contactMeta: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
    },
    input: {
      backgroundColor: colors.card,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.borderInput,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: fonts.sans,
      color: colors.text,
    },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    checkLabel: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.text,
      flex: 1,
    },
    subLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 4,
    },
    error: {
      fontFamily: fonts.sansSemiBold,
      color: colors.danger,
      fontSize: 13,
      fontWeight: '600',
    },
  });
}
