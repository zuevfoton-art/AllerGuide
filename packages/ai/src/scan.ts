import {
  ALLERGEN_KEYWORDS,
  buildAllergenKeywordsMap,
  findAllergenById,
  getCrossReactionsForSelection,
  mapExternalAllergenIds,
  mapExternalAllergenNames,
  parseProfileAllergenIds,
  extractMayContainTerms,
  stripMayContainPhrases,
  computeScanRiskLevel,
  buildScanVerdict,
  scanMatchesToLegacyLists,
  type CrossReactionMatch,
  type Profile,
  type RiskLevel,
  type ScanMatch,
  type ScanMatchKind,
} from '@allerguide/core';

export type ScanMode = 'product' | 'menu' | 'medicine' | 'cosmetics';

export interface ScanResult {
  verdict: string;
  reason: string;
  matches: string[];
  crossMatches: string[];
  traceMatches?: string[];
  unknownMatches?: string[];
  structuredMatches?: ScanMatch[];
  mode: ScanMode;
  level: RiskLevel;
  productName?: string;
  source?:
    | 'manual'
    | 'barcode'
    | 'openfoodfacts'
    | 'barcodes_db'
    | 'catalog_api'
    | 'ocr'
    | 'llm'
    | 'dish_vision'
    | 'openbeautyfacts'
    | 'openproductsfacts';
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

function findDirectMatchIds(allergenIds: string[], text: string): string[] {
  const normalizedText = text.toLowerCase();
  const keywordMap = buildAllergenKeywordsMap();

  return allergenIds.filter((allergenId) =>
    getKeywords(allergenId, keywordMap).some((keyword) =>
      normalizedText.includes(keyword.toLowerCase()),
    ),
  );
}

function findMatchedCrossReactions(allergenIds: string[], text: string): CrossReactionMatch[] {
  const normalizedText = text.toLowerCase();

  return getCrossReactionsForSelection(allergenIds).filter((item) =>
    item.allergen.keywords.some((keyword) => normalizedText.includes(keyword.toLowerCase())),
  );
}

function buildDirectMatches(allergenIds: string[], text: string): ScanMatch[] {
  return findDirectMatchIds(allergenIds, text).map((allergenId) => ({
    kind: 'direct' as ScanMatchKind,
    allergenId,
    label: findAllergenById(allergenId)?.name ?? allergenId,
    confidence: 'high' as const,
  }));
}

function buildCrossMatches(allergenIds: string[], text: string): ScanMatch[] {
  return findMatchedCrossReactions(allergenIds, text).map((item) => ({
    kind: 'cross' as ScanMatchKind,
    allergenId: item.allergen.id,
    label: item.allergen.name,
    syndrome: item.syndrome,
    risk: item.risk,
    confidence: item.risk === 'high' ? 'high' : 'medium',
  }));
}

function buildTraceMatches(allergenIds: string[], text: string, traceTerms?: string[]): ScanMatch[] {
  const terms = traceTerms ?? extractMayContainTerms(text);
  const profileFoodIds = new Set(allergenIds);
  const mappedIds = mapExternalAllergenIds(terms);
  const matches: ScanMatch[] = [];

  for (const allergenId of mappedIds) {
    if (!profileFoodIds.has(allergenId)) continue;
    matches.push({
      kind: 'trace',
      allergenId,
      label: findAllergenById(allergenId)?.name ?? allergenId,
      confidence: 'medium',
    });
  }

  const unmatched = terms.filter((term) => !mapExternalAllergenIds([term]).length);
  for (const term of unmatched) {
    const normalized = term.toLowerCase();
    const keywordMap = buildAllergenKeywordsMap();
    const hit = allergenIds.find((id) =>
      getKeywords(id, keywordMap).some((kw) => normalized.includes(kw.toLowerCase())),
    );
    if (hit) {
      matches.push({
        kind: 'trace',
        allergenId: hit,
        label: findAllergenById(hit)?.name ?? term,
        confidence: 'low',
      });
    }
  }

  return matches;
}

function buildUnknownMatches(text: string, existing: ScanMatch[]): ScanMatch[] {
  const mayContain = extractMayContainTerms(text);
  const knownLabels = new Set(existing.map((m) => m.label.toLowerCase()));

  return mayContain
    .filter((term) => {
      const mapped = mapExternalAllergenNames([term]);
      return mapped.length === 1 && mapped[0] === term.trim() && !knownLabels.has(term.toLowerCase());
    })
    .map((term) => ({
      kind: 'unknown' as ScanMatchKind,
      allergenId: term,
      label: term,
      confidence: 'low' as const,
    }));
}

export function runMockScan({
  mode,
  text,
  profile,
  productName,
  source = 'manual',
  declaredAllergenIds,
  traceAllergenIds,
}: {
  mode: ScanMode;
  text: string;
  profile?: Pick<Profile, 'allergies'> | null;
  productName?: string;
  source?: ScanResult['source'];
  /** Canonical ids from OFF/catalog declared allergens_tags */
  declaredAllergenIds?: string[];
  /** Canonical ids from OFF/catalog traces_tags */
  traceAllergenIds?: string[];
}): ScanResult {
  const allergens = parseProfileAllergens(profile);
  const declaredText = stripMayContainPhrases(text);
  const directFromText = buildDirectMatches(allergens, declaredText);
  const directFromTags =
    declaredAllergenIds?.flatMap((id) => {
      if (!allergens.includes(id)) return [];
      return [
        {
          kind: 'direct' as ScanMatchKind,
          allergenId: id,
          label: findAllergenById(id)?.name ?? id,
          confidence: 'high' as const,
        },
      ];
    }) ?? [];

  const crossFromText = buildCrossMatches(allergens, declaredText);
  const traceFromText = buildTraceMatches(allergens, text);
  const traceFromTags =
    traceAllergenIds?.flatMap((id) => {
      if (!allergens.includes(id)) return [];
      return [
        {
          kind: 'trace' as ScanMatchKind,
          allergenId: id,
          label: findAllergenById(id)?.name ?? id,
          confidence: 'medium' as const,
        },
      ];
    }) ?? [];

  const structuredMatches: ScanMatch[] = [];
  const seen = new Set<string>();

  for (const match of [
    ...directFromText,
    ...directFromTags,
    ...crossFromText,
    ...traceFromText,
    ...traceFromTags,
  ]) {
    const key = `${match.kind}:${match.allergenId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    structuredMatches.push(match);
  }

  const unknownMatches = buildUnknownMatches(text, structuredMatches);
  const allMatches = [...structuredMatches, ...unknownMatches];

  const level = computeScanRiskLevel(allMatches, allergens);
  const productSuffix = productName ? ` в «${productName}»` : '';
  const verdictBase = buildScanVerdict(level, structuredMatches);
  const legacy = scanMatchesToLegacyLists(allMatches);

  return {
    verdict: verdictBase.verdict,
    reason: `${verdictBase.reason.replace(/\.$/, '')}${productSuffix}.`,
    matches: legacy.matches,
    crossMatches: legacy.crossMatches,
    traceMatches: legacy.traceMatches,
    unknownMatches: legacy.unknownMatches,
    structuredMatches: allMatches,
    mode,
    level,
    productName,
    source,
  };
}

export const aiVersion = 'scan-5-risk-v2';
