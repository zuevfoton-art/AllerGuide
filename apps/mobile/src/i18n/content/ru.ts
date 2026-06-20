import {
  ALLERGEN_CATEGORY_LABELS,
  DIARY_SECTIONS,
  DOCTOR_REPORT_BLOCKS,
  EMERGENCY_CONTACT_RELATIONS,
  EXPERT_ARTICLES,
  EXPERT_CATEGORIES,
  EXPERT_DISCLAIMER,
  EXPERT_HERO,
} from '@allerguide/core';
import type { LocaleContent } from './types';

const diarySections = Object.fromEntries(
  DIARY_SECTIONS.map((section) => [
    section.type,
    {
      title: section.title,
      steps: Object.fromEntries(
        section.steps.map((step) => [
          step.id,
          {
            label: step.label,
            placeholder: step.placeholder,
            choices: step.choices,
          },
        ]),
      ),
    },
  ]),
) as LocaleContent['diarySections'];

const diaryTypes = Object.fromEntries(
  DIARY_SECTIONS.map((section) => [section.type, section.title]),
);

const reportBlocks = Object.fromEntries(
  DOCTOR_REPORT_BLOCKS.map((block) => [block.id, block.label]),
);

const emergencyRelations = Object.fromEntries(
  EMERGENCY_CONTACT_RELATIONS.map(({ key, label }) => [key, label]),
);

const expertCategories = Object.fromEntries(
  EXPERT_CATEGORIES.map(({ id, label }) => [id, label]),
) as LocaleContent['expertCategories'];

const expertArticles = Object.fromEntries(
  EXPERT_ARTICLES.map(({ id, title, summary, body }) => [id, { title, summary, body }]),
);

const ruContent: LocaleContent = {
  diarySections,
  diaryTypes,
  reportBlocks,
  emergencyRelations,
  allergenCategories: ALLERGEN_CATEGORY_LABELS,
  expertHero: EXPERT_HERO,
  expertDisclaimer: EXPERT_DISCLAIMER,
  expertCategories,
  expertArticles,
  wellness: {
    status: {
      good: {
        title: 'Хорошо',
        summary: 'Среда и записи дневника не указывают на повышенные риски.',
      },
      moderate: {
        title: 'Умеренно',
        summary: 'Есть отдельные факторы внимания — см. рекомендации.',
      },
      attention: {
        title: 'Повышенное внимание',
        summary: 'Несколько факторов могут влиять на самочувствие.',
      },
      'high-risk': {
        title: 'Высокий риск',
        summary: 'Рекомендуем минимизировать триггеры и проконсультироваться с врачом.',
      },
    },
    pollenTier: {
      low: 'Низкий',
      mid: 'Средний',
      high: 'Высокий',
    },
    aqiTier: {
      low: 'Хорошо',
      mid: 'Умеренно',
      high: 'Плохо',
      noData: 'Нет данных',
    },
    recommendations: {
      pollen: {
        title: 'Снизьте контакт с пыльцой',
        text: 'Уровень пыльцы «{label}» {tier}. Ограничьте прогулки в дневные часы пикового пыления.',
      },
      aqi: {
        title: 'Качество воздуха',
        text: 'Индекс EAQI {tier}. Чувствительным людям стоит сократить активность на открытом воздухе.',
      },
      symptoms: {
        title: 'Симптомы в дневнике',
        text: 'За последние 2 суток зафиксированы симптомы. Отслеживайте динамику; при ухудшении обратитесь к врачу.',
      },
      foodAllergens: {
        title: 'Пищевые аллергены',
        text: 'В профиле: {allergens}. Проверяйте состав через сканер перед покупкой новых продуктов.',
      },
      stable: {
        title: 'Стабильный день',
        text: 'Показатели среды и записи дневника не указывают на повышенные риски.',
      },
    },
    pollenLabels: {
      birch_pollen: 'Берёза',
      grass_pollen: 'Тимофеевка',
      ragweed_pollen: 'Амброзия',
    },
    locationDefault: 'Москва',
  },
  scanner: {
    verdicts: {
      high: 'Выявлено множество совпадений',
      matches: 'Есть совпадения',
      crossReaction: 'Возможна перекрёстная реакция',
      noMatches: 'Нет явных совпадений',
    },
    reasons: {
      high: 'Обнаружены значимые совпадения{productSuffix}: {matches}.',
      medium: 'Обнаружено потенциально значимое совпадение{productSuffix}: {label}.',
      low: 'Явных пересечений с аллергенами профиля не найдено{productSuffix}, но это не исключает индивидуальной реакции.',
    },
    crossSuffix: '(перекр. реакция)',
    productNotFound:
      'Продукт не найден в Open Food Facts. Проверка выполнена по штрихкоду как тексту.',
    restaurantMenu: 'Меню ресторана',
  },
  diaryValidation: {
    fillField: 'Заполните поле «{label}».',
    noDescription: 'Без описания',
  },
};

export default ruContent;
