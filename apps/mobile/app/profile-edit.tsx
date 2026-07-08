import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  normalizeAllergyConfirmations,
  parseAllergyConfirmations,
  parseProfileAllergenIds,
  type AllergyConditionId,
  type AllergyConfirmationSource,
  type ComorbidityLink,
  type ProfileType,
} from '@allerguide/core';
import { AllergenPicker } from '@/src/components/AllergenPicker';
import { AllergyConfirmationEditor } from '@/src/components/AllergyConfirmationEditor';
import { ConditionPicker } from '@/src/components/ConditionPicker';
import { getProfile, ProfileValidationError, updateProfile } from '@/src/services/profile-service';
import {
  getStoredProfileConditions,
  setStoredProfileConditions,
} from '@/src/services/profile-conditions-service';
import {
  getConditionHistoryDrafts,
  getStoredConditionHistory,
  saveConditionHistoryFromOnboarding,
} from '@/src/services/condition-history-service';
import {
  ConditionHistoryEditor,
  type ConditionHistoryDrafts,
} from '@/src/components/ConditionHistoryEditor';
import { ComorbidityEditor } from '@/src/components/ComorbidityEditor';
import {
  listEmergencyContacts,
  normalizeEmergencyContactDrafts,
  syncEmergencyContacts,
  type EmergencyContactDraft,
} from '@/src/services/emergency-contact-service';
import { EmergencyContactsEditor } from '@/src/components/EmergencyContactsEditor';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { GlassCard } from '@/src/components/GlassCard';
import { Button } from '@/src/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { reconcileComorbidityLinks, reconcileConditionHistoryDrafts } from '@/src/hooks/use-profile-setup-wizard';
import { useTranslation } from '@/src/store/locale-store';

export default function ProfileEditScreen() {
  const theme = useTheme();
  const ui = useUiStyles();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t, tProfileError } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const profileId = Number(id);
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [type, setType] = useState<ProfileType>('self');
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmations, setConfirmations] = useState<Record<string, AllergyConfirmationSource>>({});
  const [childConsent, setChildConsent] = useState(true);
  const [conditions, setConditions] = useState<AllergyConditionId[]>([]);
  const [conditionHistoryDrafts, setConditionHistoryDrafts] = useState<ConditionHistoryDrafts>({});
  const [comorbidityLinks, setComorbidityLinks] = useState<ComorbidityLink[]>([]);
  const [contacts, setContacts] = useState<EmergencyContactDraft[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void getProfile(profileId).then((row) => {
      if (!row) {
        setLoading(false);
        return;
      }

      setName(row.name);
      setBirthYear(String(row.birthYear));
      setType(row.type);
      setSelected(parseProfileAllergenIds(row.allergies));
      setConfirmations(parseAllergyConfirmations(row.allergyConfirmations));
      setContacts(
        listEmergencyContacts(profileId).map((contact) => ({
          id: contact.id,
          name: contact.name,
          phone: contact.phone,
          relation: contact.relation,
        })),
      );
      const storedConditions = getStoredProfileConditions(profileId);
      setConditions(storedConditions);
      setConditionHistoryDrafts(getConditionHistoryDrafts(profileId));
      setComorbidityLinks(getStoredConditionHistory(profileId)?.comorbidityLinks ?? []);
      setLoading(false);
    });
  }, [profileId]);

  const save = async () => {
    const trimmedName = name.trim();
    const year = Number(birthYear);

    setError('');
    try {
      await updateProfile(profileId, {
        name: trimmedName,
        birthYear: year,
        type,
        allergies: selected,
        allergyConfirmations: normalizeAllergyConfirmations(selected, confirmations),
        childConsent: type === 'child' ? childConsent : true,
      });
    } catch (err) {
      if (err instanceof ProfileValidationError) {
        setError(tProfileError(err.code));
        return;
      }
      setError(err instanceof Error ? err.message : t('profileSetup.errors.saveFailed'));
      return;
    }

    setStoredProfileConditions(profileId, conditions);
    saveConditionHistoryFromOnboarding(profileId, conditions, conditionHistoryDrafts, comorbidityLinks);
    syncEmergencyContacts(profileId, normalizeEmergencyContactDrafts(contacts));
    router.back();
  };

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
          <ScreenEyebrow section={t('profiles.eyebrow')} />
          <Text style={ui.docTitle}>{t('profileEdit.title')}</Text>
          <Text style={ui.docMeta}>{t('profileEdit.subtitle')}</Text>
        </View>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      ) : (
        <>
          <GlassCard style={styles.section}>
            <Text style={ui.sectionLabel}>{t('profileSetup.nameLabel')}</Text>
            <TextInput
              placeholder={t('profileSetup.namePlaceholder')}
              placeholderTextColor={theme.colors.textMuted}
              value={name}
              onChangeText={setName}
              style={styles.input}
            />

            <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('profileSetup.birthYearLabel')}</Text>
            <TextInput
              placeholder={t('profileSetup.birthYearPlaceholder')}
              placeholderTextColor={theme.colors.textMuted}
              value={birthYear}
              onChangeText={setBirthYear}
              keyboardType="numeric"
              style={styles.input}
            />

            <Text style={[ui.sectionLabel, styles.fieldGap]}>{t('profileSetup.profileLabel')}</Text>
            <View style={ui.toggleRow}>
              <Pressable
                style={[ui.toggle, type === 'self' && ui.toggleActive]}
                onPress={() => setType('self')}>
                <Ionicons
                  name="person"
                  size={16}
                  color={type === 'self' ? theme.colors.onAccent : theme.colors.textMuted}
                />
                <Text style={[ui.toggleText, type === 'self' && ui.toggleTextActive]}>
                  {t('profileSetup.profileSelf')}
                </Text>
              </Pressable>
              <Pressable
                style={[ui.toggle, type === 'child' && ui.toggleActive]}
                onPress={() => setType('child')}>
                <Ionicons
                  name="happy"
                  size={16}
                  color={type === 'child' ? theme.colors.onAccent : theme.colors.textMuted}
                />
                <Text style={[ui.toggleText, type === 'child' && ui.toggleTextActive]}>
                  {t('profileSetup.profileChild')}
                </Text>
              </Pressable>
            </View>
          </GlassCard>

          <GlassCard style={styles.section}>
            <Text style={ui.sectionLabel}>{t('profileSetup.conditionsLabel')}</Text>
            <ConditionPicker
              selected={conditions}
              onChange={(next) => {
                setConditions(next);
                setConditionHistoryDrafts((prev) => reconcileConditionHistoryDrafts(next, prev));
                setComorbidityLinks((prev) => reconcileComorbidityLinks(next, prev));
              }}
            />
          </GlassCard>

          {conditions.length > 0 ? (
            <GlassCard style={styles.section}>
              <Text style={ui.sectionLabel}>{t('profileEdit.conditionHistoryLabel')}</Text>
              <ConditionHistoryEditor
                conditionIds={conditions}
                drafts={conditionHistoryDrafts}
                onChange={setConditionHistoryDrafts}
              />
            </GlassCard>
          ) : null}

          {conditions.length >= 2 ? (
            <GlassCard style={styles.section}>
              <Text style={ui.sectionLabel}>{t('profileSetup.comorbidity.title')}</Text>
              <ComorbidityEditor
                conditionIds={conditions}
                links={comorbidityLinks}
                onChange={setComorbidityLinks}
              />
            </GlassCard>
          ) : null}

          <GlassCard style={styles.section}>
            <Text style={ui.sectionLabel}>{t('profileSetup.allergensLabel')}</Text>
            <AllergenPicker
              selected={selected}
              onChange={(ids) => {
                setSelected(ids);
                setConfirmations((prev) => normalizeAllergyConfirmations(ids, prev));
              }}
            />
            <AllergyConfirmationEditor
              selected={selected}
              confirmations={confirmations}
              onChange={setConfirmations}
            />
          </GlassCard>

          {type === 'child' ? (
            <Pressable style={styles.consentRow} onPress={() => setChildConsent((v) => !v)}>
              <Ionicons
                name={childConsent ? 'checkbox' : 'square-outline'}
                size={22}
                color={theme.colors.accent}
              />
              <Text style={styles.consentText}>{t('profileSetup.consent')}</Text>
            </Pressable>
          ) : null}

          <GlassCard style={styles.section}>
            <Text style={ui.sectionLabel}>{t('profileSetup.contactsLabel')}</Text>
            <EmergencyContactsEditor contacts={contacts} onChange={setContacts} />
          </GlassCard>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label={t('profileEdit.saveChanges')} variant="primary" block onPress={save} />
        </>
      )}
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
    loadingText: {
      fontFamily: fonts.sans,
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingVertical: 24,
    },
    section: { gap: 8 },
    fieldGap: { marginTop: 12 },
    input: {
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 6,
      fontSize: 16,
      fontFamily: fonts.sans,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.borderInput,
    },
    error: {
      fontFamily: fonts.sans,
      color: colors.danger,
      fontSize: 14,
      textAlign: 'center',
    },
    consentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    consentText: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
}
