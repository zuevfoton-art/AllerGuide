import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { ADAIR_DOCTORS, ADAIR_SPECIALIZATION_LABELS } from '@allerguide/core';
import { GlassCard } from '@/src/components/GlassCard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';

interface MapDoctorsSectionProps {
  onSelectClinic: (clinicId: string) => void;
}

export function MapDoctorsSection({ onSelectClinic }: MapDoctorsSectionProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [doctorsOpen, setDoctorsOpen] = useState(false);

  return (
    <>
      <Pressable
        testID="map-doctors-toggle"
        style={styles.doctorsToggle}
        hitSlop={8}
        onPress={() => setDoctorsOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: doctorsOpen }}>
        <Text style={styles.sectionTitle}>
          {doctorsOpen ? t('map.doctorsHide') : t('map.doctorsShow')}
        </Text>
        <Ionicons
          name={doctorsOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.colors.textMuted}
        />
      </Pressable>
      {doctorsOpen
        ? ADAIR_DOCTORS.map((doctor) => (
            <Pressable
              key={doctor.id}
              onPress={() => onSelectClinic(doctor.clinicId)}
              accessibilityRole="button">
              <GlassCard style={styles.card}>
                <View style={[styles.cardIcon, { backgroundColor: theme.colors.successLight }]}>
                  <Ionicons name="person" size={22} color={theme.colors.success} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{doctor.name}</Text>
                  {doctor.degree ? <Text style={styles.cardNote}>{doctor.degree}</Text> : null}
                  <Text style={styles.tags}>
                    {doctor.specialization
                      ? ADAIR_SPECIALIZATION_LABELS[doctor.specialization]
                      : doctor.role}
                  </Text>
                  {doctor.isChiefExpert ? (
                    <Text style={styles.chiefBadge}>{t('map.chiefExpert')}</Text>
                  ) : null}
                  {doctor.phone ? (
                    <Pressable
                      onPress={() => void Linking.openURL(`tel:${doctor.phone!}`)}
                      hitSlop={8}
                      accessibilityRole="link">
                      <Text style={[styles.tags, styles.phoneLink]}>{doctor.phone}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </GlassCard>
            </Pressable>
          ))
        : null}
    </>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    sectionTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 14,
      color: colors.head,
      marginTop: 4,
    },
    doctorsToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 0,
    },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: { flex: 1, gap: 6 },
    cardTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    cardNote: {
      fontFamily: fonts.sans,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    tags: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
    },
    chiefBadge: {
      alignSelf: 'flex-start',
      fontFamily: fonts.sansSemiBold,
      fontSize: 10,
      fontWeight: '600',
      color: colors.accent,
      backgroundColor: colors.accentLight,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      overflow: 'hidden',
    },
    phoneLink: {
      color: colors.accent,
      textDecorationLine: 'underline',
    },
  });
}
