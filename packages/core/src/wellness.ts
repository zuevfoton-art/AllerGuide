export type WellnessLevel = 'good' | 'moderate' | 'attention' | 'high-risk';

export interface WellnessFactor {
  id: string;
  label: string;
  value: string;
  level: 'low' | 'mid' | 'high';
  source: string;
}

export interface WellnessRecommendation {
  icon: string;
  title: string;
  text: string;
}

export interface WellnessInput {
  pollenMatches: { label: string; value: number; profileRelevant: boolean }[];
  europeanAqi: number | null;
  pm25: number | null;
  recentSymptoms: boolean;
  recentTriggers: boolean;
  foodAllergens: string[];
}

export function pollenTier(value: number): { level: 'low' | 'mid' | 'high'; label: string; penalty: number } {
  if (value < 10) return { level: 'low', label: 'Низкий', penalty: 0 };
  if (value < 50) return { level: 'mid', label: 'Средний', penalty: 12 };
  return { level: 'high', label: 'Высокий', penalty: 28 };
}

export function aqiTier(value: number | null): { level: 'low' | 'mid' | 'high'; label: string; penalty: number } {
  if (value == null) return { level: 'mid', label: 'Нет данных', penalty: 5 };
  if (value <= 20) return { level: 'low', label: 'Хорошо', penalty: 0 };
  if (value <= 50) return { level: 'mid', label: 'Умеренно', penalty: 6 };
  if (value <= 75) return { level: 'mid', label: 'Повышен', penalty: 12 };
  return { level: 'high', label: 'Плохо', penalty: 20 };
}

export function computeWellnessScore(input: WellnessInput): number {
  let penalty = 0;

  for (const match of input.pollenMatches) {
    if (match.profileRelevant) penalty += pollenTier(match.value).penalty;
  }

  penalty += aqiTier(input.europeanAqi).penalty;
  if (input.recentSymptoms) penalty += 18;
  if (input.recentTriggers) penalty += 8;

  return Math.max(5, Math.min(100, 100 - penalty));
}

export function wellnessStatusFromScore(score: number): { title: string; summary: string; level: WellnessLevel } {
  if (score >= 80) {
    return {
      title: 'Хорошо',
      summary: 'Среда и записи дневника не указывают на повышенные риски.',
      level: 'good',
    };
  }
  if (score >= 60) {
    return {
      title: 'Умеренно',
      summary: 'Есть отдельные факторы внимания — см. рекомендации.',
      level: 'moderate',
    };
  }
  if (score >= 40) {
    return {
      title: 'Повышенное внимание',
      summary: 'Несколько факторов могут влиять на самочувствие.',
      level: 'attention',
    };
  }
  return {
    title: 'Высокий риск',
    summary: 'Рекомендуем минимизировать триггеры и проконсультироваться с врачом.',
    level: 'high-risk',
  };
}

export function buildWellnessRecommendations(input: WellnessInput): WellnessRecommendation[] {
  const recs: WellnessRecommendation[] = [];

  for (const match of input.pollenMatches) {
    const tier = pollenTier(match.value);
    if (match.profileRelevant && tier.level !== 'low') {
      recs.push({
        icon: '🌿',
        title: 'Снизьте контакт с пыльцой',
        text: `Уровень пыльцы «${match.label}» ${tier.label.toLowerCase()}. Ограничьте прогулки в дневные часы пикового пыления.`,
      });
    }
  }

  const aqi = aqiTier(input.europeanAqi);
  if (aqi.level !== 'low') {
    recs.push({
      icon: '💨',
      title: 'Качество воздуха',
      text: `Индекс EAQI ${aqi.label.toLowerCase()}. Чувствительным людям стоит сократить активность на открытом воздухе.`,
    });
  }

  if (input.recentSymptoms) {
    recs.push({
      icon: '📔',
      title: 'Симптомы в дневнике',
      text: 'За последние 2 суток зафиксированы симптомы. Отслеживайте динамику; при ухудшении обратитесь к врачу.',
    });
  }

  if (input.foodAllergens.length) {
    recs.push({
      icon: '📷',
      title: 'Пищевые аллергены',
      text: `В профиле: ${input.foodAllergens.join(', ')}. Проверяйте состав через сканер перед покупкой новых продуктов.`,
    });
  }

  if (!recs.length) {
    recs.push({
      icon: '✅',
      title: 'Стабильный день',
      text: 'Показатели среды и записи дневника не указывают на повышенные риски.',
    });
  }

  return recs.slice(0, 4);
}
