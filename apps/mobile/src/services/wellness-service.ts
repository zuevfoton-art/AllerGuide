import {
  aqiTier,
  computeWellnessScore,
  getCurrentPollenAlerts,
  getDefaultPollenRegion,
  getFoodAllergenLabels,
  OPEN_METEO_POLLEN_TAXON_IDS,
  parseOpenMeteoPollenHourly,
  parseProfileAllergenIds,
  pollenTier,
  resolvePollenRegion,
  wellnessStatusFromScore,
  type WellnessRecommendation,
} from '@allerguide/core';
import { getLocaleContent } from '@/src/i18n/content';
import { LOCALE_MESSAGES } from '@/src/i18n/locales';
import { formatTemplate } from '@/src/i18n/translate';
import type { AppLocale } from '@/src/i18n/types';

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
};

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
    const tier = pollenTier(match.value);
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

  const aqi = aqiTier(input.europeanAqi);
  if (envDataAvailable && aqi.level !== 'low') {
    const tierLabel = (content.wellness.aqiTier[aqi.level] ?? aqi.label).toLowerCase();
    recs.push({
      icon: '💨',
      title: content.wellness.recommendations.aqi.title,
      text: formatTemplate(content.wellness.recommendations.aqi.text, { tier: tierLabel }),
    });
  }

  if (input.recentSymptoms) {
    recs.push({
      icon: '📔',
      title: content.wellness.recommendations.symptoms.title,
      text: content.wellness.recommendations.symptoms.text,
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
  diaryFlags: { recentSymptoms: boolean; recentTriggers: boolean },
  locale: AppLocale = 'ru',
  location?: { lat: number; lon: number; label?: string },
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

  let europeanAqi: number | null = null;
  let pm25: number | null = null;
  let envDataAvailable = false;
  let pollenMatches: { label: string; value: number; profileRelevant: boolean }[] = [];

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
    }));
  } catch {
    envDataAvailable = false;
  }

  const foodAllergens = getFoodAllergenLabels(profileAllergenIds);

  const scoreInput = {
    pollenMatches: envDataAvailable ? pollenMatches : [],
    europeanAqi: envDataAvailable ? europeanAqi : null,
    pm25: envDataAvailable ? pm25 : null,
    recentSymptoms: diaryFlags.recentSymptoms,
    recentTriggers: diaryFlags.recentTriggers,
    foodAllergens,
  };

  const score = computeWellnessScore(scoreInput);
  const status = wellnessStatusFromScore(score);
  const localizedStatus = content.wellness.status[status.level];

  const factors = envDataAvailable
    ? [
        ...pollenMatches
          .filter((m) => m.profileRelevant)
          .map((m) => ({
            label: `${messages.wellness.pollenLabel} · ${m.label}`,
            value: `${m.value.toFixed(1)} ${messages.wellness.grains}`,
            level: pollenTier(m.value).level,
          })),
        {
          label: messages.wellness.airLabel,
          value: pm25 != null ? `PM2.5 ${pm25.toFixed(1)} µg/m³` : '—',
          level: aqiTier(europeanAqi).level,
        },
        {
          label: messages.wellness.diaryLabel,
          value: diaryFlags.recentSymptoms ? messages.wellness.hasSymptoms : messages.wellness.calm,
          level: diaryFlags.recentSymptoms ? ('high' as const) : ('low' as const),
        },
      ]
    : [
        {
          label: messages.wellness.airLabel,
          value: messages.wellness.envUnavailable,
          level: 'mid' as const,
        },
        {
          label: messages.wellness.diaryLabel,
          value: diaryFlags.recentSymptoms ? messages.wellness.hasSymptoms : messages.wellness.calm,
          level: diaryFlags.recentSymptoms ? ('high' as const) : ('low' as const),
        },
      ];

  return {
    score,
    statusTitle: localizedStatus?.title ?? status.title,
    statusSummary: envDataAvailable
      ? (localizedStatus?.summary ?? status.summary)
      : content.wellness.envUnavailableSummary,
    level: status.level,
    factors,
    recommendations: buildRecommendations(scoreInput, locale, envDataAvailable, seasonalAlerts),
    updatedAt: new Date().toISOString(),
    locationLabel: resolvedLocation.label,
    regionId: region.id,
    envDataAvailable,
  };
}
