import { Text, StyleSheet, Linking, Pressable, View } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { ScreenEyebrow } from '@/src/components/ScreenEyebrow';
import { ScreenBrandHeader } from '@/src/components/brand/ScreenBrandHeader';
import { GlassCard } from '@/src/components/GlassCard';
import { EmptyState } from '@/src/components/EmptyState';
import { SosEmergencyBar } from '@/src/components/SosEmergencyBar';
import { Button } from '@/src/components/Button';
import { Disclaimer } from '@/src/components/Disclaimer';
import { Ionicons } from '@expo/vector-icons';
import {
  ANAPHYLAXIS_GRADES,
  BIPHASIC_WARNING,
  formatEpinephrineEligibilityHint,
  parseAllergies,
  type EmergencyContact,
} from '@allerguide/core';
import { useAppStore } from '@/src/store/app-store';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { localizeEmergencyRelation } from '@/src/i18n/content';
import {
  exportPassportPdf,
  sharePassportText,
} from '@/src/services/doctor-report-service';
import { getAllergyPassport } from '@/src/services/sos-passport-service';
import { isProfileEpinephrineEligible } from '@/src/services/clinical-phenotype-service';
import {
  getEmergencyNumber,
  getProfileAge,
  getSosActionPlan,
  getSosNotes,
  listEmergencyContacts,
} from '@/src/services/sos-service';
import { trackEvent } from '@/src/services/analytics-service';

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
  const [passportOpen, setPassportOpen] = useState(false);
  const [anaphylaxisOpen, setAnaphylaxisOpen] = useState(false);
  const [passport, setPassport] = useState(() => getAllergyPassport(profile?.id ?? 0));
  const [sharing, setSharing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
    setPassport(getAllergyPassport(profile.id));
  }, [profile]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    try {
      refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      trackEvent('sos_opened');
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

  const kitChecked = passport.shockKit.filter((item) => item.checked);
  const epinephrineEligible = profile ? isProfileEpinephrineEligible(profile) : false;
  const epinephrineHint =
    epinephrineEligible && !passport.epinephrine?.brand
      ? formatEpinephrineEligibilityHint(true)
      : null;
  const hasPassportDetails =
    passport.drugIntolerances.length > 0 ||
    passport.triggers.length > 0 ||
    passport.epinephrine?.brand ||
    passport.doctorName ||
    passport.anaphylaxisHistory ||
    kitChecked.length > 0;

  const handleShare = async () => {
    if (!profile) return;
    setSharing(true);
    try {
      await sharePassportText(profile);
    } finally {
      setSharing(false);
    }
  };

  const handlePdf = async () => {
    if (!profile) return;
    setSharing(true);
    try {
      await exportPassportPdf(profile);
    } finally {
      setSharing(false);
    }
  };

  const firstContact = contacts[0] ?? null;

  return (
    <Screen
      onRefresh={() => handleRefresh()}
      refreshing={refreshing}
      pinnedTop={
        profile ? (
          <SosEmergencyBar
            emergencyLabel={t('sos.call', { number: emergencyNumber })}
            contactName={firstContact?.name}
            contactPhone={firstContact?.phone}
            contactRelation={
              firstContact
                ? localizeEmergencyRelation(firstContact.relation, localeContent)
                : undefined
            }
            callContactLabel={t('sos.callContact')}
            onCallEmergency={() => void Linking.openURL(`tel:${emergencyNumber}`)}
            onCallContact={() => firstContact && callPhone(firstContact.phone)}
          />
        ) : undefined
      }>
      <ScreenBrandHeader />
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <ScreenEyebrow section={t('sos.eyebrow')} />
          <Text style={ui.docTitle}>{t('sos.title')}</Text>
          <Text style={ui.docMeta}>{t('sos.subtitle')}</Text>
        </View>
      </View>

      {epinephrineHint ? (
        <GlassCard style={styles.epiHintCard}>
          <Text style={styles.epiHintText}>{epinephrineHint}</Text>
        </GlassCard>
      ) : null}

      {profile ? (
        <>
          <GlassCard testID="sos-profile-card">
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
          </GlassCard>

          <Pressable
            testID="sos-passport-toggle"
            style={styles.collapseHead}
            onPress={() => setPassportOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: passportOpen }}
            accessibilityLabel={t('sos.passportTitle')}>
            <Text style={styles.collapseTitle}>{t('sos.passportTitle')}</Text>
            <Ionicons
              name={passportOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.colors.textMuted}
            />
          </Pressable>

          {passportOpen ? (
            <GlassCard>
              {hasPassportDetails ? (
                <>
                  {passport.drugIntolerances.length > 0 ? (
                    <View style={styles.passportRow}>
                      <Text style={styles.passportLabel}>{t('sos.drugIntolerances')}</Text>
                      <Text style={styles.passportValue}>{passport.drugIntolerances.join(', ')}</Text>
                    </View>
                  ) : null}
                  {passport.triggers.length > 0 ? (
                    <View style={styles.passportRow}>
                      <Text style={styles.passportLabel}>{t('sos.triggers')}</Text>
                      <Text style={styles.passportValue}>{passport.triggers.join(', ')}</Text>
                    </View>
                  ) : null}
                  {passport.epinephrine?.brand ? (
                    <View style={styles.passportRow}>
                      <Text style={styles.passportLabel}>{t('sos.epinephrine')}</Text>
                      <Text style={styles.passportValue}>
                        {[passport.epinephrine.brand, passport.epinephrine.expiry, passport.epinephrine.location]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                  ) : null}
                  {passport.doctorName || passport.doctorPhone ? (
                    <View style={styles.passportRow}>
                      <Text style={styles.passportLabel}>{t('sos.doctor')}</Text>
                      <Text style={styles.passportValue}>
                        {[passport.doctorName, passport.doctorPhone].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  ) : null}
                  {passport.anaphylaxisHistory ? (
                    <Text style={styles.warnText}>{t('sos.anaphylaxisHistory')}</Text>
                  ) : null}
                  {kitChecked.length > 0 ? (
                    <View style={styles.passportRow}>
                      <Text style={styles.passportLabel}>{t('sos.shockKit')}</Text>
                      <Text style={styles.passportValue}>{kitChecked.map((i) => i.label).join('; ')}</Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={styles.hintText}>{t('sos.passportEmpty')}</Text>
              )}
              <View style={styles.exportRow}>
                <Button
                  label={sharing ? t('sos.sharing') : t('sos.sharePassport')}
                  variant="secondary"
                  size="sm"
                  onPress={() => void handleShare()}
                />
                <Button
                  label={t('sos.exportPdf')}
                  variant="secondary"
                  size="sm"
                  onPress={() => void handlePdf()}
                />
              </View>
            </GlassCard>
          ) : null}

          <Pressable
            style={styles.collapseHead}
            onPress={() => setAnaphylaxisOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: anaphylaxisOpen }}
            accessibilityLabel={t('sos.anaphylaxisTitle')}>
            <Text style={styles.collapseTitle}>{t('sos.anaphylaxisTitle')}</Text>
            <Ionicons
              name={anaphylaxisOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.colors.textMuted}
            />
          </Pressable>

          {anaphylaxisOpen ? (
            <GlassCard style={styles.anaphylaxisCard}>
              {ANAPHYLAXIS_GRADES.map((grade) => (
                <View key={grade.grade} style={styles.gradeBlock}>
                  <Text style={styles.gradeTitle}>{grade.title}</Text>
                  <Text style={styles.gradeSigns}>{grade.signs}</Text>
                  {grade.actions.map((action) => (
                    <Text key={action} style={styles.gradeAction}>
                      · {action}
                    </Text>
                  ))}
                </View>
              ))}
              <View style={styles.biphasicTip}>
                <Ionicons name="alert-circle-outline" size={16} color={theme.colors.warning} />
                <Text style={styles.biphasicText}>{BIPHASIC_WARNING}</Text>
              </View>
            </GlassCard>
          ) : null}

          {(notes || planSteps.length > 0) && (
            <GlassCard>
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
          )}
        </>
      ) : (
        <EmptyState
          icon="person-add-outline"
          title={t('sos.emptyProfile')}
          actionLabel={t('common.createProfile')}
          onAction={() => router.push('/profile-setup?mode=add')}
        />
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
                accessibilityLabel={`${t('sos.callContact')}: ${contact.name}`}
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

      <View style={styles.tipCard}>
        <Ionicons name="information-circle-outline" size={18} color={theme.colors.accent} />
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
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    collapseHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    collapseTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
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
    passportRow: { gap: 4, marginBottom: 8 },
    passportLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    passportValue: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    warnText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 13,
      color: colors.danger,
      fontWeight: '600',
      marginBottom: 8,
    },
    exportRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    anaphylaxisCard: { gap: 12 },
    gradeBlock: { gap: 4 },
    gradeTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      fontWeight: '600',
      color: colors.head,
    },
    gradeSigns: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    gradeAction: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
      paddingLeft: 4,
    },
    biphasicTip: {
      flexDirection: 'row',
      gap: 8,
      backgroundColor: colors.warningLight,
      padding: 10,
      borderRadius: 6,
      alignItems: 'flex-start',
    },
    biphasicText: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 17,
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
    epiHintCard: { gap: 10, borderColor: colors.dangerBorder, backgroundColor: colors.dangerLight },
    epiHintText: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.text,
      lineHeight: 18,
    },
    tipCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: colors.tipBg,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.tipBorder,
    },
    tipText: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.tipText,
      lineHeight: 18,
      flex: 1,
    },
  });
}
