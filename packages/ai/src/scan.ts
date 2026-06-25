import {
  ALLERGEN_KEYWORDS,
  buildAllergenKeywordsMap,
  findAllergenById,
  getCrossReactionsForSelection,
  parseProfileAllergenIds,
  type CrossReactionMatch,
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
  return parseProfileAllergenIds(profile.allergies);
}

function getKeywords(allergenId: string, keywordMap: Record<string, string[]>): string[] {
  const record = findAllergenById(allergenId);
  if (record) return record.keywords;
  const normalized = allergenId.toLowerCase().trim();
  return keywordMap[normalized] ?? ALLERGEN_KEYWORDS[normalized] ?? [normalized];
}

function findDirectMatches(allergenIds: string[], text: string): string[] {
  const normalizedText = text.toLowerCase();
  const keywordMap = buildAllergenKeywordsMap();

  return allergenIds
    .filter((allergenId) =>
      getKeywords(allergenId, keywordMap).some((keyword) =>
        normalizedText.includes(keyword.toLowerCase()),
      ),
    )
    .map((id) => findAllergenById(id)?.name ?? id);
}

function findMatchedCrossReactions(allergenIds: string[], text: string): CrossReactionMatch[] {
  const normalizedText = text.toLowerCase();

  return getCrossReactionsForSelection(allergenIds).filter((item) =>
    item.allergen.keywords.some((keyword) => normalizedText.includes(keyword.toLowerCase())),
  );
}

function buildLevel(directCount: number, crossMatches: CrossReactionMatch[]): RiskLevel {
  const highCrossCount = crossMatches.filter((item) => item.risk === 'high').length;

  if (directCount >= 2 || (directCount >= 1 && highCrossCount >= 1)) return 'high';
  if (directCount >= 1 || highCrossCount >= 1) return 'medium';
  return 'low';
}

function formatCrossMatchLabel(match: CrossReactionMatch): string {
  return `${match.allergen.name} (перекр. реакция)`;
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
  const matchedCrossReactions = findMatchedCrossReactions(allergens, text);
  const crossMatches = matchedCrossReactions.map(formatCrossMatchLabel);
  const level = buildLevel(directMatches.length, matchedCrossReactions);
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
