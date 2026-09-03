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

/** Strip optional ``` / ```json fences models often add despite the prompt. */
export function stripLlmJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

export function parseLlmScanResponse(
  raw: string,
  mode: ScanMode,
  profileAllergenIds: string[] = [],
  productName?: string,
): ScanResult | null {
  try {
    const cleaned = stripLlmJsonFence(raw);
    const parsed = JSON.parse(cleaned) as LlmScanResponse;
    if (!parsed?.verdict || !parsed?.reason || !parsed?.level) return null;

    return enrichLlmScanResult(parsed, mode, profileAllergenIds, productName);
  } catch {
    return null;
  }
}

/** LLM enrichment must never hang the scan UI; abort and fall through to keyword scan. */
export const LLM_SCAN_TIMEOUT_MS = 20_000;

export async function runLlmScan(input: {
  endpoint: string;
  apiKey?: string;
  mode: ScanMode;
  text: string;
  allergens: string[];
  productName?: string;
  timeoutMs?: number;
}): Promise<ScanResult | null> {
  const prompt = buildScanPrompt(input);
  const timeoutMs = input.timeoutMs ?? LLM_SCAN_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
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
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      result?: LlmScanResponse | ScanResult;
      content?: string;
    } | null;

    if (!payload) return null;

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
  } catch {
    // Network / abort / parse — caller falls back to runMockScan.
    return null;
  } finally {
    clearTimeout(timeout);
  }
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
    try {
      const llmResult = await runLlmScan({
        endpoint: input.llmEndpoint,
        apiKey: input.llmApiKey,
        mode: input.mode,
        text: input.text,
        allergens,
        productName: input.productName,
      });
      if (llmResult) return llmResult;
    } catch {
      // Defensive: runLlmScan already soft-fails; never block keyword fallback.
    }
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
