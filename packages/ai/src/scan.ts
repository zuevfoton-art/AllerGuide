import {
  ALLERGEN_KEYWORDS,
  buildAllergenKeywordsMap,
  getCrossReactionsForSelection,
  type Profile,
  type RiskLevel,
} from '@allerguide/core';

export type ScanMode = 'product' | 'menu' | 'medicine' | 'cosmetics';

export interface ScanResult {
  verdict: string;
  reason: string;
  matches: string[];
  crossMatches: string[];
  mode: ScanMode;
  level: RiskLevel;
  productName?: string;
  source?: 'manual' | 'barcode' | 'openfoodfacts' | 'barcodes_db' | 'catalog_api' | 'ocr' | 'llm';
}

function parseProfileAllergens(profile?: Pick<Profile, 'allergies'> | null): string[] {
  if (!profile?.allergies) return [];
  try {
    return JSON.parse(profile.allergies) as string[];
  } catch {
    return [];
  }
}

function getKeywords(allergen: string, keywordMap: Record<string, string[]>): string[] {
  const normalized = allergen.toLowerCase().trim();
  return keywordMap[normalized] ?? ALLERGEN_KEYWORDS[normalized] ?? [normalized.split('/')[0]?.trim() ?? normalized];
}

function findDirectMatches(allergens: string[], text: string): string[] {
  const normalizedText = text.toLowerCase();
  const keywordMap = buildAllergenKeywordsMap();

  return allergens.filter((allergen) =>
    getKeywords(allergen, keywordMap).some((keyword) => normalizedText.includes(keyword)),
  );
}

function findCrossMatches(allergens: string[], text: string): string[] {
  const normalizedText = text.toLowerCase();
  const keywordMap = buildAllergenKeywordsMap();
  const crossReactions = getCrossReactionsForSelection(allergens);

  return crossReactions
    .filter((item) =>
      item.allergen.keywords.some((keyword) => normalizedText.includes(keyword.toLowerCase())),
    )
    .map((item) => `${item.allergen.name} (перекр. реакция)`);
}

function buildLevel(directCount: number, crossCount: number): RiskLevel {
  if (directCount >= 2 || (directCount >= 1 && crossCount >= 1)) return 'high';
  if (directCount >= 1 || crossCount >= 1) return 'medium';
  return 'low';
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
  const allergens = parseProfileAllergens(profile);
  const directMatches = findDirectMatches(allergens, text);
  const crossMatches = findCrossMatches(allergens, text);
  const level = buildLevel(directMatches.length, crossMatches.length);
  const productSuffix = productName ? ` в «${productName}»` : '';

  if (level === 'high') {
    const parts = [...directMatches, ...crossMatches];
    return {
      verdict: 'Выявлено множество совпадений',
      reason: `Обнаружены значимые совпадения${productSuffix}: ${parts.join(', ')}.`,
      matches: directMatches,
      crossMatches,
      mode,
      level,
      productName,
      source,
    };
  }

  if (level === 'medium') {
    const label = directMatches[0] ?? crossMatches[0];
    return {
      verdict: directMatches.length > 0 ? 'Есть совпадения' : 'Возможна перекрёстная реакция',
      reason: `Обнаружено потенциально значимое совпадение${productSuffix}: ${label}.`,
      matches: directMatches,
      crossMatches,
      mode,
      level,
      productName,
      source,
    };
  }

  return {
    verdict: 'Нет явных совпадений',
    reason: `Явных пересечений с аллергенами профиля не найдено${productSuffix}, но это не исключает индивидуальной реакции.`,
    matches: directMatches,
    crossMatches,
    mode,
    level,
    productName,
    source,
  };
}

export const aiVersion = 'scan-4-smart-llm';
