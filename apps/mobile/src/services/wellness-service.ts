import {
  aqiTier,
  computeWellnessScore,
  pollenTier,
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
};

const POLLEN_KEYS = ['birch_pollen', 'grass_pollen', 'ragweed_pollen'] as const;

function currentHourlyMax(hourly: Record<string, number[]>, key: string): number {
  const values = hourly[key];
  if (!values?.length) return 0;
  return Math.max(...values.filter((v) => v != null));
}

function profileMatchesPollen(allergies: string[], label: string): boolean {
  const normalized = allergies.map((a) => a.toLowerCase());
  const needle = label.toLowerCase();
  return normalized.some((a) => a.includes(needle) || needle.includes(a));
}

function buildRecommendations(
  input: Parameters<typeof computeWellnessScore>[0],
  locale: AppLocale,
): WellnessRecommendation[] {
  const content = getLocaleContent(locale);
  const recs: WellnessRecommendation[] = [];

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
  if (aqi.level !== 'low') {
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
  allergies: string[],
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

  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${resolvedLocation.lat}` +
    `&longitude=${resolvedLocation.lon}&timezone=Europe%2FMoscow&forecast_days=1` +
    `&current=european_aqi,pm2_5&hourly=${POLLEN_KEYS.join(',')}`;

  let europeanAqi: number | null = null;
  let pm25: number | null = null;
  const pollenMatches: { label: string; value: number; profileRelevant: boolean }[] = [];

  try {
    const res = await fetch(url);
    const data = await res.json();
    europeanAqi = data.current?.european_aqi ?? null;
    pm25 = data.current?.pm2_5 ?? null;
    for (const key of POLLEN_KEYS) {
      const label = content.wellness.pollenLabels[key];
      const value = currentHourlyMax(data.hourly ?? {}, key);
      pollenMatches.push({
        label,
        value,
        profileRelevant: profileMatchesPollen(allergies, label),
      });
    }
  } catch {
    const fallbackLabel = content.wellness.pollenLabels.birch_pollen;
    pollenMatches.push({
      label: fallbackLabel,
      value: 42,
      profileRelevant: profileMatchesPollen(allergies, fallbackLabel),
    });
    europeanAqi = 45;
    pm25 = 18;
  }

  const foodAllergens = allergies.filter((a) =>
    ['молоко', 'milk', 'арахис', 'peanut', 'яйц', 'egg', 'орех', 'nut', 'рыба', 'fish', 'соя', 'soy', 'пшени', 'wheat'].some(
      (k) => a.toLowerCase().includes(k),
    ),
  );

  const scoreInput = {
    pollenMatches,
    europeanAqi,
    pm25,
    recentSymptoms: diaryFlags.recentSymptoms,
    recentTriggers: diaryFlags.recentTriggers,
    foodAllergens,
  };

  const score = computeWellnessScore(scoreInput);
  const status = wellnessStatusFromScore(score);
  const localizedStatus = content.wellness.status[status.level];

  const factors = [
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
  ];

  return {
    score,
    statusTitle: localizedStatus?.title ?? status.title,
    statusSummary: localizedStatus?.summary ?? status.summary,
    level: status.level,
    factors,
    recommendations: buildRecommendations(scoreInput, locale),
    updatedAt: new Date().toISOString(),
    locationLabel: resolvedLocation.label,
  };
}
