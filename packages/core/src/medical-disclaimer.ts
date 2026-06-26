/**
 * MDR-aligned medical disclaimer v2 (E.5).
 * AllerGuide is decision support — not a medical device / SaMD.
 */

export const MEDICAL_DISCLAIMER_VERSION = 'mdr-v2';

export type MdrProductClassification = 'decision-support' | 'wellness-log' | 'not-samd';

export interface MdrClassification {
  version: string;
  /** EU MDR 2017/745 — app is not placed as a medical device. */
  euMdrStatus: 'not-a-medical-device';
  classification: MdrProductClassification;
  intendedUse: string;
  limitations: string[];
  emergencyGuidance: string;
}

export const MDR_CLASSIFICATION: MdrClassification = {
  version: MEDICAL_DISCLAIMER_VERSION,
  euMdrStatus: 'not-a-medical-device',
  classification: 'decision-support',
  intendedUse:
    'Personal allergy diary, product label screening, environmental context, and wellness index ' +
    'for self-management support. Does not diagnose, treat, or prevent disease.',
  limitations: [
    'Scanner results are heuristic and may miss undeclared allergens or traces.',
    'Wellness index uses beta-calibrated weights pending clinical validation.',
    'Pollen and air-quality data are approximate third-party feeds.',
    'Doctor PDF reports reflect user-entered observations, not clinical records.',
  ],
  emergencyGuidance:
    'При анафилаксии или затруднённом дыхании немедленно вызовите экстренную помощь (103 / 112).',
};

export interface MedicalDisclaimerBlock {
  id: string;
  short: string;
  full: string;
}

export const MEDICAL_DISCLAIMER_BLOCKS: Record<string, MedicalDisclaimerBlock> = {
  global: {
    id: 'global',
    short:
      'AllerGuide — инструмент поддержки решений, не медицинское изделие. Не заменяет консультацию врача.',
    full:
      'Индекс самочувствия, сканер, дневник и рекомендации AllerGuide носят информационный характер ' +
      'и предназначены для самонаблюдения. Приложение не является медицинским изделием по EU MDR 2017/745 ' +
      'и не ставит диагноз. Лечение и диагностику определяет только квалифицированный специалист.',
  },
  wellness: {
    id: 'wellness',
    short: 'Индекс носит рекомендательный характер и не заменяет консультацию аллерголога.',
    full:
      'Индекс самочувствия построен на открытых данных среды и вашем дневнике. Веса находятся в бета-калибровке ' +
      'и могут изменяться после клинической валидации.',
  },
  scanner: {
    id: 'scanner',
    short: 'Результат сканера предварительный и не исключает индивидуальной реакции.',
    full:
      'Проверка состава основана на ключевых словах, регуляторных тегах и открытых базах. ' +
      'Всегда читайте этикетку и консультируйтесь с врачом при пищевой аллергии.',
  },
  diary: {
    id: 'diary',
    short: 'Дневник отражает наблюдения пользователя и не является медицинской документацией.',
    full:
      'PDF-отчёт для врача формируется из данных, введённых пользователем, и служит только для обсуждения с лечащим врачом.',
  },
  expert: {
    id: 'expert',
    short: 'Экспертный контент носит справочный характер и не является назначением.',
    full:
      'Материалы АДАИР и консультативного совета AllerGuide не заменяют очную консультацию аллерголога.',
  },
};

export function getMedicalDisclaimer(id: keyof typeof MEDICAL_DISCLAIMER_BLOCKS = 'global'): MedicalDisclaimerBlock {
  return MEDICAL_DISCLAIMER_BLOCKS[id] ?? MEDICAL_DISCLAIMER_BLOCKS.global;
}

export function formatDisclaimerFootnote(version = MEDICAL_DISCLAIMER_VERSION): string {
  return `${version} · decision support · not SaMD`;
}
