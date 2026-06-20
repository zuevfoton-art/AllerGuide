import type { RiskLevel } from '@allerguide/core';
import type { Profile } from '@allerguide/core';
import type { ScanMode, ScanResult } from './scan';
import { runMockScan } from './scan';

export interface LlmScanRequest {
  mode: ScanMode;
  text: string;
  allergens: string[];
  productName?: string;
}

export interface LlmScanResponse {
  verdict: string;
  reason: string;
  matches: string[];
  crossMatches: string[];
  level: RiskLevel;
}

export function buildScanPrompt(input: LlmScanRequest): string {
  const allergenList = input.allergens.length > 0 ? input.allergens.join(', ') : 'не указаны';
  return [
    'Ты помощник по проверке продуктов и меню на аллергены.',
    'Ответь ТОЛЬКО JSON без markdown:',
    '{"verdict":"...","reason":"...","matches":[],"crossMatches":[],"level":"low|medium|high"}',
    `Режим: ${input.mode}`,
    `Аллергены профиля: ${allergenList}`,
    input.productName ? `Продукт: ${input.productName}` : null,
    `Текст для анализа: ${input.text}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function parseLlmScanResponse(raw: string, mode: ScanMode, productName?: string): ScanResult | null {
  try {
    const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned) as LlmScanResponse;
    if (!parsed?.verdict || !parsed?.reason || !parsed?.level) return null;

    return {
      verdict: parsed.verdict,
      reason: parsed.reason,
      matches: Array.isArray(parsed.matches) ? parsed.matches.map(String) : [],
      crossMatches: Array.isArray(parsed.crossMatches) ? parsed.crossMatches.map(String) : [],
      mode,
      level: parsed.level,
      productName,
      source: 'llm',
    };
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
    return parseLlmScanResponse(JSON.stringify(result), input.mode, input.productName);
  }

  if (payload.content) {
    return parseLlmScanResponse(payload.content, input.mode, input.productName);
  }

  return null;
}

export async function runSmartScan(input: {
  mode: ScanMode;
  text: string;
  profile?: Pick<Profile, 'allergies'> | null;
  productName?: string;
  source?: ScanResult['source'];
  llmEndpoint?: string;
  llmApiKey?: string;
}): Promise<ScanResult> {
  let allergens: string[] = [];
  if (input.profile?.allergies) {
    try {
      allergens = JSON.parse(input.profile.allergies) as string[];
    } catch {
      allergens = [];
    }
  }

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
  });
}
