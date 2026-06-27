import { Text, View, StyleSheet, Pressable } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/src/components/Screen';
import { ProfileSwitcher } from '@/src/components/ProfileSwitcher';
import { GlassCard } from '@/src/components/GlassCard';
import { Disclaimer } from '@/src/components/Disclaimer';
import { YandexMap } from '@/src/components/YandexMap';
import { useUiStyles } from '@/src/hooks/use-glass-styles';
import { Ionicons } from '@expo/vector-icons';
import {
  ADAIR_CLINICS,
  ADAIR_DOCTORS,
  ADAIR_SPECIALIZATION_LABELS,
  buildPlacesMapUrl,
  buildBirchPollenMapUrl,
  buildAdairClinicsMapUrl,
  getPlaceLevelColor,
  getPlaceLevelLabel,
  getPollenPeaksForMonth,
  formatPollenMonth,
  resolvePollenRegion,
  type CatalogPlace,
} from '@allerguide/core';
import { useAppStore } from '@/src/store/app-store';
import { useTheme, type AppTheme } from '@/src/hooks/use-theme';
import { useTranslation } from '@/src/store/locale-store';
import { getRecommendedPlaces } from '@/src/services/place-service';
import { ProfileHeaderButton } from '@/src/components/ProfileHeaderButton';

const LAYERS = [
  { key: 'places', labelKey: 'map.places' },
  { key: 'pollen', labelKey: 'map.pollen' },
  { key: 'adair', labelKey: 'map.adair' },
] as const;

type MapLayer = (typeof LAYERS)[number]['key'];

const ADAIR_CITIES = ['Все', ...Array.from(new Set(ADAIR_CLINICS.map((c) => c.city)))];

export default function MapScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const ui = useUiStyles();
  const { t } = useTranslation();
  const profile = useAppStore((s) => s.activeProfile);
  const [layer, setLayer] = useState<MapLayer>('places');
  const [places, setPlaces] = useState<CatalogPlace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('Все');

  const refresh = useCallback(async () => {
    setPlaces(getRecommendedPlaces(profile));
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const selected = places.find((place) => place.id === selectedId) ?? places[0] ?? null;
  const mapUrl = useMemo(() => buildPlacesMapUrl(places, selectedId), [places, selectedId]);

  const pollenMonth = new Date().getMonth() + 1;
  const pollenRegion = resolvePollenRegion(55.75, 37.62);
  const pollenPeaks = getPollenPeaksForMonth(pollenMonth, pollenRegion.id);

  const birchMapUrl = useMemo(
    () =>
      buildBirchPollenMapUrl(pollenRegion.id, {
        latitude: pollenRegion.lat,
        longitude: pollenRegion.lon,
      }),
    [pollenRegion.id, pollenRegion.lat, pollenRegion.lon],
  );

  const filteredClinics = useMemo(
    () => (selectedCity === 'Все' ? ADAIR_CLINICS : ADAIR_CLINICS.filter((c) => c.city === selectedCity)),
    [selectedCity],
  );

  const filteredDoctors = useMemo(
    () =>
      selectedCity === 'Все'
        ? ADAIR_DOCTORS
        : ADAIR_DOCTORS.filter((d) => filteredClinics.some((c) => c.id === d.clinicId)),
    [selectedCity, filteredClinics],
  );

  const adairMapUrl = useMemo(() => buildAdairClinicsMapUrl(filteredClinics), [filteredClinics]);

  const levelBg = useMemo(
    () =>
      ({
        high: theme.isDark ? '#1A3D28' : theme.colors.successLight,
        medium: theme.isDark ? '#3D2E10' : theme.colors.warningLight,
        low: theme.isDark ? '#3D1512' : theme.colors.dangerLight,
      }) as Record<CatalogPlace['level'], string>,
    [theme],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={ui.docLabel}>AllerGuide · {t('map.eyebrow')}</Text>
          <Text style={ui.docTitle}>{t('map.title')}</Text>
          <Text style={ui.docMeta}>{t('map.subtitle')}</Text>
          <Text style={styles.regionLabel}>{pollenRegion.name}</Text>
        </View>
        <ProfileHeaderButton />
      </View>

      <ProfileSwitcher />

      <View style={ui.toggleRow}>
        {LAYERS.map((item) => (
          <Pressable
            key={item.key}
            style={[ui.toggle, layer === item.key && ui.toggleActive]}
            onPress={() => setLayer(item.key)}>
            <Text style={[ui.toggleText, layer === item.key && ui.toggleTextActive]}>
              {t(item.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── СЛОЙ: РЕСТОРАНЫ / МЕСТА ─────────────────────────────────────── */}
      {layer === 'places' ? (
        <>
          {places.length > 0 ? (
            <YandexMap url={mapUrl} />
          ) : (
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map" size={40} color={theme.colors.textMuted} />
              <Text style={styles.mapText}>{t('map.emptyPlaces')}</Text>
            </View>
          )}

          <Text style={styles.mapAttribution}>{t('map.yandexAttribution')}</Text>
          <Text style={ui.sectionLabel}>{t('map.recommended')}</Text>

          {places.map((place) => {
            const levelColor = getPlaceLevelColor(place.level, theme.isDark);
            const levelLabel = getPlaceLevelLabel(place.level);
            const isSelected = selected?.id === place.id;

            return (
              <GlassCard key={place.id} style={styles.card}>
                <Pressable
                  style={({ pressed }) => [
                    styles.cardInner,
                    isSelected && styles.cardSelected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setSelectedId(place.id)}>
                  <View style={[styles.cardIcon, { backgroundColor: levelBg[place.level] }]}>
                    <Ionicons name={place.icon as any} size={22} color={levelColor} />
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cardTitle}>{place.title}</Text>
                      <View style={[styles.badge, { backgroundColor: levelBg[place.level] }]}>
                        <Text style={[styles.badgeText, { color: levelColor }]}>{levelLabel}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardNote}>{place.note}</Text>
                    {place.tags.length > 0 ? (
                      <Text style={styles.tags}>{place.tags.join(' · ')}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                </Pressable>
              </GlassCard>
            );
          })}

          <Disclaimer>{t('map.disclaimerPlaces')}</Disclaimer>
        </>
      ) : null}

      {/* ── СЛОЙ: ПЫЛЕНИЕ БЕРЁЗЫ ────────────────────────────────────────── */}
      {layer === 'pollen' ? (
        <>
          <YandexMap url={birchMapUrl} height={240} />
          <Text style={styles.mapAttribution}>{t('map.yandexAttribution')}</Text>

          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.danger }]} />
            <Text style={styles.legendText}>{t('map.birchHigh')}</Text>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.warning }]} />
            <Text style={styles.legendText}>{t('map.birchMedium')}</Text>
          </View>

          <GlassCard style={styles.pollenHero}>
            <Ionicons name="leaf" size={24} color={theme.colors.success} />
            <Text style={styles.pollenTitle}>
              {t('map.pollenMapTitle', { month: formatPollenMonth(pollenMonth) })}
            </Text>
            <Text style={styles.pollenSub}>{t('map.birchMapSub')}</Text>
          </GlassCard>

          {pollenPeaks.length > 0 ? (
            <>
              <Text style={ui.sectionLabel}>{t('map.pollenMapTitle', { month: formatPollenMonth(pollenMonth) })}</Text>
              {pollenPeaks.map((peak) => (
                <GlassCard key={peak.taxonId} style={styles.card}>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{peak.label}</Text>
                    <Text style={styles.cardNote}>
                      {t('map.peakSeason', {
                        month: formatPollenMonth(peak.peakMonth),
                        region: pollenRegion.name,
                      })}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: theme.colors.warningLight }]}>
                    <Text style={[styles.badgeText, { color: theme.colors.warning }]}>
                      {t('map.season')}
                    </Text>
                  </View>
                </GlassCard>
              ))}
            </>
          ) : (
            <GlassCard style={styles.emptyPollen}>
              <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
              <Text style={styles.emptyPollenText}>{t('map.pollenQuiet')}</Text>
            </GlassCard>
          )}

          <Disclaimer>{t('map.disclaimerPollen')}</Disclaimer>
        </>
      ) : null}

      {/* ── СЛОЙ: КЛИНИКИ АДАИР ─────────────────────────────────────────── */}
      {layer === 'adair' ? (
        <>
          <YandexMap url={adairMapUrl} height={240} />
          <Text style={styles.mapAttribution}>{t('map.yandexAttribution')}</Text>

          {/* Легенда маркеров */}
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.danger }]} />
            <Text style={styles.legendText}>{t('map.nkcc')}</Text>
            <View style={[styles.legendDot, { backgroundColor: '#2D7DD2' }]} />
            <Text style={styles.legendText}>{t('map.adairClinicLabel')}</Text>
          </View>

          {/* Фильтр по городу */}
          <View style={styles.cityFilterRow}>
            {ADAIR_CITIES.map((city) => (
              <Pressable
                key={city}
                style={[styles.cityChip, selectedCity === city && styles.cityChipActive]}
                onPress={() => setSelectedCity(city)}>
                <Text style={[styles.cityChipText, selectedCity === city && styles.cityChipTextActive]}>
                  {city === 'Все' ? t('map.allCities') : city}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={ui.sectionLabel}>{t('map.adairClinics')}</Text>

          {filteredClinics.map((clinic) => (
            <GlassCard key={clinic.id} style={styles.card}>
              <View style={[styles.cardIcon, { backgroundColor: clinic.isNkcc ? `${theme.colors.danger}18` : `${theme.colors.purple}18` }]}>
                <Ionicons
                  name="medical"
                  size={22}
                  color={clinic.isNkcc ? theme.colors.danger : theme.colors.purple}
                />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{clinic.name}</Text>
                  {clinic.isNkcc ? (
                    <View style={[styles.badge, { backgroundColor: `${theme.colors.danger}18` }]}>
                      <Text style={[styles.badgeText, { color: theme.colors.danger }]}>
                        {t('map.nkcc')}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.cardNote}>{clinic.address}</Text>
                <Text style={styles.tags}>{clinic.phone}</Text>
              </View>
              {clinic.bookingUrl ? (
                <Ionicons name="open-outline" size={16} color={theme.colors.accent} />
              ) : null}
            </GlassCard>
          ))}

          {filteredDoctors.length > 0 ? (
            <>
              <Text style={ui.sectionLabel}>{t('map.adairDoctors')}</Text>
              {filteredDoctors.map((doctor) => (
                <GlassCard key={doctor.id} style={styles.card}>
                  <View style={[styles.cardIcon, { backgroundColor: theme.colors.successLight }]}>
                    <Ionicons name="person" size={22} color={theme.colors.success} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{doctor.name}</Text>
                    <Text style={styles.cardNote}>{doctor.degree}</Text>
                    <Text style={styles.tags}>
                      {ADAIR_SPECIALIZATION_LABELS[doctor.specialization]}
                    </Text>
                    {doctor.isChiefExpert ? (
                      <Text style={[styles.tags, { color: theme.colors.accent }]}>
                        {t('map.chiefExpert')}
                      </Text>
                    ) : null}
                  </View>
                </GlassCard>
              ))}
            </>
          ) : null}

          <Disclaimer>{t('map.disclaimerAdair')}</Disclaimer>
        </>
      ) : null}
    </Screen>
  );
}

function createStyles({ colors, fonts }: AppTheme) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerText: { flex: 1, gap: 2 },
    regionLabel: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 12,
      fontWeight: '600',
      color: colors.accent,
      marginTop: 4,
    },
    pollenHero: { alignItems: 'center', gap: 6 },
    pollenTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 16,
      fontWeight: '600',
      color: colors.head,
      textAlign: 'center',
    },
    pollenSub: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    emptyPollen: { alignItems: 'center', gap: 8, paddingVertical: 20 },
    emptyPollenText: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    mapPlaceholder: {
      height: 160,
      backgroundColor: colors.surfaceMuted,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mapText: {
      fontFamily: fonts.sans,
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: 24,
      lineHeight: 20,
    },
    mapAttribution: {
      fontFamily: fonts.sans,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 6,
      marginBottom: 2,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
      flexWrap: 'wrap',
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendText: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
      marginRight: 8,
    },
    cityFilterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 8,
    },
    cityChip: {
      paddingVertical: 5,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    cityChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentLight,
    },
    cityChipText: {
      fontFamily: fonts.sans,
      fontSize: 12,
      color: colors.textSecondary,
    },
    cityChipTextActive: {
      fontFamily: fonts.sansSemiBold,
      fontWeight: '600',
      color: colors.accent,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 0,
    },
    cardInner: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
    cardSelected: { opacity: 0.92 },
    pressed: { opacity: 0.85 },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: { flex: 1, gap: 4 },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    cardTitle: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
      flexShrink: 1,
    },
    badge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4 },
    badgeText: {
      fontFamily: fonts.sansSemiBold,
      fontSize: 11,
      fontWeight: '600',
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
  });
}
