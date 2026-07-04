import {
  buildScanVerdict,
  computeScanRiskLevel,
  findAllergenById,
  mapExternalAllergenToId,
  parseProfileAllergenIds,
  type Profile,
  type RiskLevel,
  type ScanMatch,
  type ScanMatchKind,
} from '@allerguide/core';
import type { ScanMode, ScanResult } from './scan';
import { runMockScan } from './scan';

export interface LlmScanRequest {
  mode: ScanMode;
  text: string;
  allergens: string[];
  productName?: string;
}

export interface LlmStructuredMatch {
  kind: ScanMatchKind;
  allergenId?: string;
  label: string;
}

export interface LlmScanResponse {
  verdict: string;
  reason: string;
  matches: string[];
  crossMatches: string[];
  structuredMatches?: LlmStructuredMatch[];
  traceMatches?: string[];
  level: RiskLevel;
}

export function buildScanPrompt(input: LlmScanRequest): string {
  const allergenList = input.allergens.length > 0 ? input.allergens.join(', ') : 'не указаны';
  return [
    'Ты помощник по проверке продуктов и меню на аллергены.',
    'Ответь ТОЛЬКО JSON без markdown:',
    '{"verdict":"...","reason":"...","matches":[],"crossMatches":[],"structuredMatches":[{"kind":"direct|cross|trace","allergenId":"milk","label":"Молоко"}],"traceMatches":[],"level":"low|medium|high"}',
    `Режим: ${input.mode}`,
    `Аллергены профиля: ${allergenList}`,
    input.productName ? `Продукт: ${input.productName}` : null,
    `Текст для анализа: ${input.text}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildStructuredFromLlm(
  parsed: LlmScanResponse,
  profileAllergenIds: string[],
): ScanMatch[] {
  if (Array.isArray(parsed.structuredMatches) && parsed.structuredMatches.length > 0) {
    return parsed.structuredMatches.map((item) => ({
      kind: item.kind,
      allergenId: item.allergenId ?? mapExternalAllergenToId(item.label) ?? item.label,
      label: item.label,
      confidence: item.kind === 'direct' ? 'high' : 'medium',
    }));
  }

  const structured: ScanMatch[] = [];
  for (const label of parsed.matches ?? []) {
    const ids = mapExternalAllergenToId(label);
    structured.push({
      kind: 'direct',
      allergenId: ids ?? label.toLowerCase(),
      label,
      confidence: 'high',
    });
  }
  for (const label of parsed.crossMatches ?? []) {
    structured.push({
      kind: 'cross',
      allergenId: mapExternalAllergenToId(label) ?? label.toLowerCase(),
      label,
      confidence: 'medium',
    });
  }
  for (const label of parsed.traceMatches ?? []) {
    structured.push({
      kind: 'trace',
      allergenId: mapExternalAllergenToId(label) ?? label.toLowerCase(),
      label: findAllergenById(label)?.name ?? label,
      confidence: 'medium',
    });
  }

  if (structured.length === 0 && profileAllergenIds.length === 0) {
    return structured;
  }

  return structured;
}

export function enrichLlmScanResult(
  parsed: LlmScanResponse,
  mode: ScanMode,
  profileAllergenIds: string[],
  productName?: string,
): ScanResult {
  const structuredMatches = buildStructuredFromLlm(parsed, profileAllergenIds);
  const level =
    structuredMatches.length > 0
      ? computeScanRiskLevel(structuredMatches, profileAllergenIds as ReturnType<typeof parseProfileAllergenIds>)
      : parsed.level;

  const verdictBundle =
    structuredMatches.length > 0
      ? buildScanVerdict(level, structuredMatches)
      : { verdict: parsed.verdict, reason: parsed.reason };

  const direct = structuredMatches.filter((m) => m.kind === 'direct').map((m) => m.label);
  const cross = structuredMatches.filter((m) => m.kind === 'cross').map((m) => m.label);
  const trace = structuredMatches.filter((m) => m.kind === 'trace').map((m) => m.label);

  return {
    verdict: verdictBundle.verdict,
    reason: verdictBundle.reason,
    matches: direct.length > 0 ? direct : parsed.matches ?? [],
    crossMatches: cross.length > 0 ? cross : parsed.crossMatches ?? [],
    traceMatches: trace.length > 0 ? trace : parsed.traceMatches,
    structuredMatches,
    mode,
    level,
    productName,
    source: 'llm',
  };
}

export function parseLlmScanResponse(
  raw: string,
  mode: ScanMode,
  profileAllergenIds: string[] = [],
  productName?: string,
): ScanResult | null {
  try {
    const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned) as LlmScanResponse;
    if (!parsed?.verdict || !parsed?.reason || !parsed?.level) return null;

    return enrichLlmScanResult(parsed, mode, profileAllergenIds, productName);
  } catch {
    return null;
  }
}

export async function runLlmScan(input: {
  endpoint: string;
  apiKey?: string;
  mode: ScanMode;
  text: string;
  allergens: string[];
  productName?: string;
}): Promise<ScanResult | null> {
  const prompt = buildScanPrompt(input);

  const response = await fetch(input.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {}),
    },
    body: JSON.stringify({
      mode: input.mode,
      text: input.text,
      allergens: input.allergens,
      productName: input.productName,
      prompt,
    }),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    ok?: boolean;
    result?: LlmScanResponse | ScanResult;
    content?: string;
  };

  if (payload.result && 'verdict' in payload.result) {
    const result = payload.result;
    if ('mode' in result && 'crossMatches' in result) {
      return result as ScanResult;
    }
    return parseLlmScanResponse(JSON.stringify(result), input.mode, input.allergens, input.productName);
  }

  if (payload.content) {
    return parseLlmScanResponse(payload.content, input.mode, input.allergens, input.productName);
  }

  return null;
}

export async function runSmartScan(input: {
  mode: ScanMode;
  text: string;
  profile?: Pick<Profile, 'allergies'> | null;
  productName?: string;
  source?: ScanResult['source'];
  declaredAllergenIds?: string[];
  traceAllergenIds?: string[];
  llmEndpoint?: string;
  llmApiKey?: string;
}): Promise<ScanResult> {
  const allergens = input.profile?.allergies
    ? parseProfileAllergenIds(input.profile.allergies)
    : [];

  if (input.llmEndpoint) {
    const llmResult = await runLlmScan({
      endpoint: input.llmEndpoint,
      apiKey: input.llmApiKey,
      mode: input.mode,
      text: input.text,
      allergens,
      productName: input.productName,
    });
    if (llmResult) return llmResult;
  }

  return runMockScan({
    mode: input.mode,
    text: input.text,
    profile: input.profile,
    productName: input.productName,
    source: input.source,
    declaredAllergenIds: input.declaredAllergenIds,
    traceAllergenIds: input.traceAllergenIds,
  });
}
