import {
  aqiTier,
  buildClinicalScalesFromTrends,
  buildDiarySeriesFromInsights,
  buildAsitSummaryFromCompliance,
  collectLatestScaleTrends,
  computeAsitCompliance,
  computeDiaryInsights,
  computeWellnessConfidence,
  computeWellnessScore,
  computeWellnessScoreBreakdown,
  hasAriaAsthmaMultimorbidity,
  getCurrentPollenAlerts,
  getDefaultPollenRegion,
  getFoodAllergenLabels,
  OPEN_METEO_POLLEN_TAXON_IDS,
  parseOpenMeteoPollenHourly,
  parseProfileAllergenIds,
  pollenTier,
  resolvePollenRegion,
  airQualityRiskFromUaqi,
  wellnessStatusFromScore,
  WELLNESS_WEIGHTS_VERSION,
  derivePrimaryWellnessFactor,
  verbalizeDiaryDays,
  verbalizePm25,
  verbalizePollenValue,
  verbalizeWellnessIndex,
  type AirQualitySnapshot,
  type DiaryEntry,
  type PollenMatchLike,
  type WellnessPrimaryFactorId,
  type WellnessRecommendation,
  type WellnessVerbalTier,
} from '@allerguide/core';
import { fetchAirQualitySnapshot } from '@/src/services/air-quality-service';
import { getLocaleContent } from '@/src/i18n/content';
import { LOCALE_MESSAGES } from '@/src/i18n/locales';
import { formatTemplate } from '@/src/i18n/translate';
import type { AppLocale } from '@/src/i18n/types';
import { trackEvent } from '@/src/services/analytics-service';
import { logCaughtError } from '@/src/services/error-reporting';
import { getStoredProfileConditions } from '@/src/services/profile-conditions-service';

export type WellnessConfidence = 'high' | 'medium' | 'low';

export type WellnessSnapshot = {
  score: number;
  statusTitle: string;
  statusSummary: string;
  level: 'good' | 'moderate' | 'attention' | 'high-risk';
  factors: { label: string; value: string; level: 'low' | 'mid' | 'high' }[];
  recommendations: WellnessRecommendation[];
  updatedAt: string;
  locationLabel: string;
  regionId: string;
  /** False when Open-Meteo air-quality data could not be loaded (no synthetic fallback). */
  envDataAvailable: boolean;
  /** Data quality indicator (B.7). */
  confidence: WellnessConfidence;
  weightsVersion: string;
  pollenMatches: PollenMatchLike[];
  display: {
    indexTier: WellnessVerbalTier;
    pollenTier: WellnessVerbalTier;
    airTier: WellnessVerbalTier;
    diaryTier: WellnessVerbalTier;
    primaryFactorId: WellnessPrimaryFactorId;
    pollenValue: number | null;
    pm25: number | null;
    symptomDays: number;
  };
};

function formatGoogleAirFactorValue(snapshot: AirQualitySnapshot): string {
  const index = snapshot.local ?? snapshot.universal;
  if (!index) return '—';
  const name = index.code === 'uaqi' ? 'UAQI' : (index.displayName ?? 'AQI');
  return index.category ? `${name} ${index.aqi} · ${index.category}` : `${name} ${index.aqi}`;
}

function labelForPollenTaxon(
  taxonId: string,
  content: ReturnType<typeof getLocaleContent>,
): string {
  return content.wellness.pollenLabels[taxonId] ?? taxonId;
}

function buildRecommendations(
  input: Parameters<typeof computeWellnessScore>[0],
  locale: AppLocale,
  envDataAvailable: boolean,
  seasonalAlerts: { label: string }[],
  crossReactionNames: string[],
  googleAirQuality?: AirQualitySnapshot | null,
): WellnessRecommendation[] {
  const content = getLocaleContent(locale);
  const recs: WellnessRecommendation[] = [];

  if (!envDataAvailable) {
    recs.push({
      icon: '🌐',
      title: content.wellness.recommendations.envUnavailable.title,
      text: content.wellness.recommendations.envUnavailable.text,
    });
  }

  for (const alert of seasonalAlerts) {
    recs.push({
      icon: '📅',
      title: content.wellness.recommendations.seasonalPollen.title,
      text: formatTemplate(content.wellness.recommendations.seasonalPollen.text, {
        label: alert.label,
      }),
    });
  }

  for (const match of input.pollenMatches) {
    const tier = pollenTier(match.value, match.taxonId);
    if (match.profileRelevant && tier.level !== 'low') {
      const tierLabel = content.wellness.pollenTier[tier.level].toLowerCase();
      recs.push({
        icon: '🌿',
        title: content.wellness.recommendations.pollen.title,
        text: formatTemplate(content.wellness.recommendations.pollen.text, {
          label: match.label,
          tier: tierLabel,
        }),
      });
    }
  }

  // Google health recommendation (already localized via languageCode) takes
  // priority over the generic Open-Meteo AQI tier hint.
  const googleAqRecommendation =
    googleAirQuality?.healthRecommendations?.sensitive ??
    googleAirQuality?.healthRecommendations?.general;
  const googleAqRisk = airQualityRiskFromUaqi(googleAirQuality?.universal?.aqi ?? null);
  if (googleAirQuality?.universal && googleAqRecommendation && googleAqRisk !== 'low') {
    recs.push({
      icon: '💨',
      title: content.wellness.recommendations.aqi.title,
      text: googleAqRecommendation,
    });
  } else {
    const aqi = aqiTier(input.europeanAqi);
    if (envDataAvailable && aqi.level !== 'low') {
      const tierLabel = (content.wellness.aqiTier[aqi.level] ?? aqi.label).toLowerCase();
      recs.push({
        icon: '💨',
        title: content.wellness.recommendations.aqi.title,
        text: formatTemplate(content.wellness.recommendations.aqi.text, { tier: tierLabel }),
      });
    }
  }

  if (input.diary.symptomDays >= 2) {
    const symptomsWeek = content.wellness.recommendations.symptomsWeek;
    recs.push({
      icon: '📔',
      title: symptomsWeek?.title ?? content.wellness.recommendations.symptoms.title,
      text: formatTemplate(symptomsWeek?.text ?? content.wellness.recommendations.symptoms.text, {
        days: String(input.diary.symptomDays),
      }),
    });
  } else if (input.diary.symptomDays === 1) {
    recs.push({
      icon: '📔',
      title: content.wellness.recommendations.symptoms.title,
      text: content.wellness.recommendations.symptoms.text,
    });
  }

  for (const scale of input.clinicalScales) {
    if (scale.level !== 'good') {
      const clinicalScale = content.wellness.recommendations.clinicalScale;
      recs.push({
        icon: '📊',
        title: formatTemplate(clinicalScale?.title ?? 'Scale {label}', {
          label: scale.label,
        }),
        text: formatTemplate(clinicalScale?.text ?? '{total} ({level})', {
          total: String(scale.total),
          level: scale.level,
        }),
      });
    }
  }

  if (crossReactionNames.length) {
    const crossReaction = content.wellness.recommendations.crossReaction;
    recs.push({
      icon: '🔗',
      title: crossReaction?.title ?? 'Cross-reactions',
      text: formatTemplate(crossReaction?.text ?? '{allergens}', {
        allergens: crossReactionNames.join(', '),
      }),
    });
  }

  if (input.foodAllergens.length) {
    recs.push({
      icon: '📷',
      title: content.wellness.recommendations.foodAllergens.title,
      text: formatTemplate(content.wellness.recommendations.foodAllergens.text, {
        allergens: input.foodAllergens.join(', '),
      }),
    });
  }

  if (!recs.length) {
    recs.push({
      icon: '✅',
      title: content.wellness.recommendations.stable.title,
      text: content.wellness.recommendations.stable.text,
    });
  }

  return recs.slice(0, 4);
}

export async function fetchWellnessSnapshot(
  profileAllergiesJson: string,
  diaryEntries: DiaryEntry[] = [],
  locale: AppLocale = 'ru',
  location?: { lat: number; lon: number; label?: string },
  options?: { profileId?: number },
): Promise<WellnessSnapshot> {
  const content = getLocaleContent(locale);
  const messages = LOCALE_MESSAGES[locale];
  const region = location
    ? resolvePollenRegion(location.lat, location.lon)
    : getDefaultPollenRegion();
  const resolvedLocation = {
    lat: location?.lat ?? region.lat,
    lon: location?.lon ?? region.lon,
    label: location?.label ?? region.name,
  };

  const profileAllergenIds = parseProfileAllergenIds(profileAllergiesJson);
  const conditionIds = options?.profileId ? getStoredProfileConditions(options.profileId) : [];
  const multimorbidAriaAsthma = hasAriaAsthmaMultimorbidity(conditionIds);
  const diaryInsights = computeDiaryInsights(diaryEntries);
  const diarySeries = buildDiarySeriesFromInsights(diaryInsights);
  const clinicalScales = buildClinicalScalesFromTrends(collectLatestScaleTrends(diaryEntries));

  const month = new Date().getMonth() + 1;
  const seasonalAlerts = getCurrentPollenAlerts(month, profileAllergenIds, region.id).map(
    (peak) => ({ label: peak.label }),
  );

  const timezone = encodeURIComponent(region.timezone);
  const pollenHourly = OPEN_METEO_POLLEN_TAXON_IDS.join(',');
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${resolvedLocation.lat}` +
    `&longitude=${resolvedLocation.lon}&timezone=${timezone}&forecast_days=1` +
    `&current=european_aqi,pm2_5&hourly=${pollenHourly}`;

  // Optional Google Air Quality enrichment (UAQI + localized health advice).
  // The wellness score keeps using Open-Meteo values for stability.
  const googleAirQualityPromise = fetchAirQualitySnapshot(
    resolvedLocation.lat,
    resolvedLocation.lon,
    locale,
  );

  let europeanAqi: number | null = null;
  let pm25: number | null = null;
  let envDataAvailable = false;
  let pollenMatches: {
    label: string;
    value: number;
    profileRelevant: boolean;
    taxonId?: (typeof OPEN_METEO_POLLEN_TAXON_IDS)[number];
    allergenId?: string | null;
  }[] = [];

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const data = await res.json();
    europeanAqi = data.current?.european_aqi ?? null;
    pm25 = data.current?.pm2_5 ?? null;
    envDataAvailable = true;

    pollenMatches = parseOpenMeteoPollenHourly(
      data.hourly ?? {},
      profileAllergenIds,
      (taxonId) => labelForPollenTaxon(taxonId, content),
    ).map((reading) => ({
      label: reading.label,
      value: reading.value,
      profileRelevant: reading.profileRelevant,
      taxonId: reading.taxonId as (typeof OPEN_METEO_POLLEN_TAXON_IDS)[number],
      allergenId: reading.allergenId,
    }));
  } catch (error) {
    logCaughtError('fetchWellnessEnvironment', error, { level: 'warn' });
    envDataAvailable = false;
  }

  const googleAirQuality = await googleAirQualityPromise;

  const foodAllergens = getFoodAllergenLabels(profileAllergenIds);
  const asitCompliance = computeAsitCompliance(diaryEntries, 30);
  const asit = buildAsitSummaryFromCompliance(asitCompliance);

  const scoreInput = {
    profileAllergenIds,
    pollenMatches: envDataAvailable ? pollenMatches : [],
    europeanAqi: envDataAvailable ? europeanAqi : null,
    pm25: envDataAvailable ? pm25 : null,
    diary: diarySeries,
    clinicalScales,
    foodAllergens,
    envDataAvailable,
    asit,
    multimorbidAriaAsthma,
  };

  const score = computeWellnessScore(scoreInput);
  const breakdown = computeWellnessScoreBreakdown(scoreInput);
  const status = wellnessStatusFromScore(score);
  const localizedStatus = content.wellness.status[status.level];

  const confidence = computeWellnessConfidence({
    envDataAvailable,
    diaryWeekTotal: diarySeries.weekTotal,
    clinicalScalesCount: clinicalScales.length,
  });

  const crossReactionNames = breakdown.crossReactionMatches.map((m) => m.allergen.name);

  const factors = envDataAvailable
    ? [
        ...pollenMatches
          .filter((m) => m.profileRelevant)
          .map((m) => ({
            label: `${messages.wellness.pollenLabel} · ${m.label}`,
            value: `${m.value.toFixed(1)} ${messages.wellness.grains}`,
            level: pollenTier(m.value, m.taxonId).level,
          })),
        {
          label: messages.wellness.airLabel,
          value: googleAirQuality?.universal
            ? formatGoogleAirFactorValue(googleAirQuality)
            : pm25 != null
              ? `PM2.5 ${pm25.toFixed(1)} µg/m³`
              : '—',
          level: googleAirQuality?.universal
            ? airQualityRiskFromUaqi(googleAirQuality.universal.aqi)
            : aqiTier(europeanAqi).level,
        },
        {
          label: messages.wellness.diaryLabel,
          value:
            diarySeries.symptomDays > 0
              ? formatTemplate(messages.wellness.symptomDays, {
                  days: String(diarySeries.symptomDays),
                })
              : messages.wellness.calm,
          level: diarySeries.symptomDays >= 3 ? ('high' as const) : diarySeries.symptomDays >= 1 ? ('mid' as const) : ('low' as const),
        },
      ]
    : [
        {
          label: messages.wellness.airLabel,
          value: googleAirQuality?.universal
            ? formatGoogleAirFactorValue(googleAirQuality)
            : messages.wellness.envUnavailable,
          level: googleAirQuality?.universal
            ? airQualityRiskFromUaqi(googleAirQuality.universal.aqi)
            : ('mid' as const),
        },
        {
          label: messages.wellness.diaryLabel,
          value:
            diarySeries.symptomDays > 0
              ? formatTemplate(messages.wellness.symptomDays, {
                  days: String(diarySeries.symptomDays),
                })
              : messages.wellness.calm,
          level: diarySeries.symptomDays >= 3 ? ('high' as const) : diarySeries.symptomDays >= 1 ? ('mid' as const) : ('low' as const),
        },
      ];

  trackEvent('wellness_refreshed', {
    score,
    level: status.level,
    env_data: envDataAvailable,
    confidence,
  });

  return {
    score,
    statusTitle: localizedStatus?.title ?? status.title,
    statusSummary: envDataAvailable
      ? (localizedStatus?.summary ?? status.summary)
      : content.wellness.envUnavailableSummary,
    level: status.level,
    factors,
    recommendations: buildRecommendations(
      scoreInput,
      locale,
      envDataAvailable,
      seasonalAlerts,
      crossReactionNames,
      googleAirQuality,
    ),
    updatedAt: new Date().toISOString(),
    locationLabel: resolvedLocation.label,
    regionId: region.id,
    envDataAvailable,
    confidence,
    weightsVersion: WELLNESS_WEIGHTS_VERSION,
    pollenMatches: envDataAvailable ? pollenMatches : [],
    display: {
      indexTier: verbalizeWellnessIndex(score),
      pollenTier: verbalizePollenValue(
        envDataAvailable
          ? pollenMatches.find((match) => match.profileRelevant)?.value ??
              pollenMatches[0]?.value ??
              null
          : null,
      ),
      airTier: verbalizePm25(envDataAvailable ? pm25 : null),
      diaryTier: verbalizeDiaryDays(diarySeries.symptomDays),
      primaryFactorId: derivePrimaryWellnessFactor(breakdown).id,
      pollenValue: envDataAvailable
        ? pollenMatches.find((match) => match.profileRelevant)?.value ??
          pollenMatches[0]?.value ??
          null
        : null,
      pm25: envDataAvailable ? pm25 : null,
      symptomDays: diarySeries.symptomDays,
    },
  };
}
