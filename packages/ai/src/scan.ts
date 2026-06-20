import { ALLERGEN_KEYWORDS, type Profile, type RiskLevel } from '@allerguide/core';

export type ScanMode = 'product' | 'menu' | 'medicine';

export interface ScanResult {
  verdict: string;
  reason: string;
  matches: string[];
  mode: ScanMode;
  level: RiskLevel;
  productName?: string;
  source?: 'manual' | 'barcode' | 'openfoodfacts';
}

function getKeywords(allergen: string): string[] {
  const normalized = allergen.toLowerCase().trim();
  return ALLERGEN_KEYWORDS[normalized] ?? [normalized.split('/')[0]?.trim() ?? normalized];
}

function findAllergenMatches(allergens: string[], text: string): string[] {
  const normalizedText = text.toLowerCase();
  return allergens.filter((allergen) =>
    getKeywords(allergen).some((keyword) => normalizedText.includes(keyword)),
  );
}

export function runMockScan({
  mode,
  text,
  profile,
  productName,
  source = 'manual',
}: {
  mode: ScanMode;
  text: string;
  profile?: Pick<Profile, 'allergies'> | null;
  productName?: string;
  source?: ScanResult['source'];
}): ScanResult {
  const allergens: string[] = profile?.allergies
    ? (() => {
        try {
          return JSON.parse(profile.allergies) as string[];
        } catch {
          return [];
        }
      })()
    : [];

  const matches = findAllergenMatches(allergens, text);

  if (matches.length >= 2) {
    return {
      verdict: 'Выявлено множество совпадений',
      reason: `Обнаружено несколько совпадений${productName ? ` в «${productName}»` : ''}: ${matches.join(', ')}.`,
      matches,
      mode,
      level: 'high',
      productName,
      source,
    };
  }

  if (matches.length === 1) {
    return {
      verdict: 'Есть частичные совпадения',
      reason: `Обнаружено потенциально значимое совпадение${productName ? ` в «${productName}»` : ''}: ${matches[0]}.`,
      matches,
      mode,
      level: 'medium',
      productName,
      source,
    };
  }

  return {
    verdict: 'Нет явных совпадений',
    reason: `Явных пересечений с аллергенами профиля не найдено${productName ? ` в «${productName}»` : ''}, но это не исключает индивидуальной реакции.`,
    matches,
    mode,
    level: 'low',
    productName,
    source,
  };
}
