import {
  aqiTier,
  computeWellnessScore,
  getFoodAllergenLabels,
  OPEN_METEO_POLLEN_ALLERGEN_IDS,
  parseProfileAllergenIds,
  pollenTier,
  profileHasPollenAllergen,
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
  /** False when Open-Meteo air-quality data could not be loaded (no synthetic fallback). */
  envDataAvailable: boolean;
};

const POLLEN_KEYS = ['birch_pollen', 'grass_pollen', 'ragweed_pollen'] as const;

function currentHourlyMax(hourly: Record<string, number[]>, key: string): number {
  const values = hourly[key];
  if (!values?.length) return 0;
  return Math.max(...values.filter((v) => v != null));
}

function buildRecommendations(
  input: Parameters<typeof computeWellnessScore>[0],
  locale: AppLocale,
  envDataAvailable: boolean,
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
  location?: { lat: number; lon: number; label: string },
): Promise<WellnessSnapshot> {
  const content = getLocaleContent(locale);
  const messages = LOCALE_MESSAGES[locale];
  const resolvedLocation = location ?? {
    lat: 55.75,
    lon: 37.62,
    label: content.wellness.locationDefault,
  };

  const profileAllergenIds = parseProfileAllergenIds(profileAllergiesJson);

  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${resolvedLocation.lat}` +
    `&longitude=${resolvedLocation.lon}&timezone=Europe%2FMoscow&forecast_days=1` +
    `&current=european_aqi,pm2_5&hourly=${POLLEN_KEYS.join(',')}`;

  let europeanAqi: number | null = null;
  let pm25: number | null = null;
  let envDataAvailable = false;
  const pollenMatches: { label: string; value: number; profileRelevant: boolean }[] = [];

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const data = await res.json();
    europeanAqi = data.current?.european_aqi ?? null;
    pm25 = data.current?.pm2_5 ?? null;
    envDataAvailable = true;
    for (const key of POLLEN_KEYS) {
      const label = content.wellness.pollenLabels[key];
      const pollenAllergenId = OPEN_METEO_POLLEN_ALLERGEN_IDS[key];
      const value = currentHourlyMax(data.hourly ?? {}, key);
      pollenMatches.push({
        label,
        value,
        profileRelevant: profileHasPollenAllergen(profileAllergenIds, pollenAllergenId),
      });
    }
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
    recommendations: buildRecommendations(scoreInput, locale, envDataAvailable),
    updatedAt: new Date().toISOString(),
    locationLabel: resolvedLocation.label,
    envDataAvailable,
  };
}
