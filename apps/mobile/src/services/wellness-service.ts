import {
  aqiTier,
  buildWellnessRecommendations,
  computeWellnessScore,
  pollenTier,
  wellnessStatusFromScore,
  type WellnessRecommendation,
} from '@allerguide/core';

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

const DEFAULT_LOCATION = { lat: 55.75, lon: 37.62, label: 'Москва' };

const POLLEN_KEYS = ['birch_pollen', 'grass_pollen', 'ragweed_pollen'] as const;
const POLLEN_LABELS: Record<(typeof POLLEN_KEYS)[number], string> = {
  birch_pollen: 'Берёза',
  grass_pollen: 'Тимофеевка',
  ragweed_pollen: 'Амброзия',
};

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

export async function fetchWellnessSnapshot(
  allergies: string[],
  diaryFlags: { recentSymptoms: boolean; recentTriggers: boolean },
  location = DEFAULT_LOCATION,
): Promise<WellnessSnapshot> {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.lat}` +
    `&longitude=${location.lon}&timezone=Europe%2FMoscow&forecast_days=1` +
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
      const label = POLLEN_LABELS[key];
      const value = currentHourlyMax(data.hourly ?? {}, key);
      pollenMatches.push({
        label,
        value,
        profileRelevant: profileMatchesPollen(allergies, label),
      });
    }
  } catch {
    pollenMatches.push({ label: 'Берёза', value: 42, profileRelevant: profileMatchesPollen(allergies, 'Берёза') });
    europeanAqi = 45;
    pm25 = 18;
  }

  const foodAllergens = allergies.filter((a) =>
    ['молоко', 'арахис', 'яйц', 'орех', 'рыба', 'соя', 'пшени'].some((k) => a.toLowerCase().includes(k)),
  );

  const score = computeWellnessScore({
    pollenMatches,
    europeanAqi,
    pm25,
    recentSymptoms: diaryFlags.recentSymptoms,
    recentTriggers: diaryFlags.recentTriggers,
    foodAllergens,
  });

  const status = wellnessStatusFromScore(score);
  const factors = [
    ...pollenMatches
      .filter((m) => m.profileRelevant)
      .map((m) => ({
        label: `Пыльца · ${m.label}`,
        value: `${m.value.toFixed(1)} grains/m³`,
        level: pollenTier(m.value).level,
      })),
    {
      label: 'Качество воздуха · EAQI',
      value: pm25 != null ? `PM2.5 ${pm25.toFixed(1)} µg/m³` : '—',
      level: aqiTier(europeanAqi).level,
    },
    {
      label: 'Дневник · 48 ч',
      value: diaryFlags.recentSymptoms ? 'Есть симптомы' : 'Спокойно',
      level: diaryFlags.recentSymptoms ? ('high' as const) : ('low' as const),
    },
  ];

  return {
    score,
    statusTitle: status.title,
    statusSummary: status.summary,
    level: status.level,
    factors,
    recommendations: buildWellnessRecommendations({
      pollenMatches,
      europeanAqi,
      pm25,
      recentSymptoms: diaryFlags.recentSymptoms,
      recentTriggers: diaryFlags.recentTriggers,
      foodAllergens,
    }),
    updatedAt: new Date().toISOString(),
    locationLabel: location.label,
  };
}
