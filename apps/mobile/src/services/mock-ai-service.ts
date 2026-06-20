import { ALLERGEN_KEYWORDS } from '@/src/constants/allergens';
import type { Profile } from '@/src/types';

export type ScanMode = 'product' | 'menu' | 'medicine';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface ScanResult {
  verdict: string;
  reason: string;
  matches: string[];
  mode: ScanMode;
  level: RiskLevel;
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
}: {
  mode: ScanMode;
  text: string;
  profile?: Profile | null;
}): ScanResult {
  const allergens: string[] = profile?.allergies ? JSON.parse(profile.allergies) : [];
  const matches = findAllergenMatches(allergens, text);

  if (matches.length >= 2) {
    return {
      verdict: 'Выявлено множество совпадений',
      reason: `Mock AI обнаружил несколько совпадений состава с активным профилем: ${matches.join(', ')}.`,
      matches,
      mode,
      level: 'high',
    };
  }

  if (matches.length === 1) {
    return {
      verdict: 'Есть частичные совпадения',
      reason: `Mock AI обнаружил одно потенциально значимое совпадение: ${matches[0]}.`,
      matches,
      mode,
      level: 'medium',
    };
  }

  return {
    verdict: 'Нет явных совпадений',
    reason: 'Mock AI не нашёл явных пересечений с текущими аллергенами профиля, но это не исключает индивидуальную реакцию.',
    matches,
    mode,
    level: 'low',
  };
}
