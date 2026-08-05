/**
 * Multimodal LLM for POST /api/scan/dish-vision (Option D).
 * Domain prompt/parse stay in @allerguide/ai; this module only talks HTTP.
 */

import {
  buildDishVisionPrompt,
  dishVisionSystemInstruction,
} from '@allerguide/ai';
import { resolveLlmScanProvider, type LlmScanProvider } from './llm-scan-provider';

/** AI Studio OpenAI-compatible chat (not llm.api — that host 403s many VL models). */
const DEFAULT_YANDEX_VISION_BASE_URL = 'https://ai.api.cloud.yandex.net/v1/chat/completions';

/**
 * Confirmed multimodal model in staging folder catalog (image_url smoke → 200).
 * Lockbox `YC_VISION_MODEL` should match; gemma-3-27b-it is not available (403).
 */
const DEFAULT_YC_VISION_MODEL = 'qwen3.6-35b-a3b/latest';

const MAX_ERROR_SNIPPET = 240;

export interface DishVisionLlmInput {
  imageBase64: string;
  mimeType?: string;
}

/** Structured provider failure — route maps to 502 + providerStatus. */
export class DishVisionProviderError extends Error {
  readonly status: number;
  readonly providerError: string;

  constructor(status: number, providerError: string) {
    super(`Dish vision provider HTTP ${status}`);
    this.name = 'DishVisionProviderError';
    this.status = status;
    this.providerError = providerError.slice(0, MAX_ERROR_SNIPPET);
  }
}

/**
 * Build gpt:// URI for Yandex AI Studio.
 * If model already has a version segment (e.g. `qwen3.6-35b-a3b/latest`), do not append `/latest`.
 */
export function buildYandexVisionModelUri(folderId: string, model: string): string {
  const trimmed = model.trim();
  if (trimmed.startsWith('gpt://')) return trimmed;
  const withVersion = trimmed.includes('/') ? trimmed : `${trimmed}/latest`;
  return `gpt://${folderId}/${withVersion}`;
}

function stripDataUrl(base64: string): string {
  const trimmed = base64.trim();
  const comma = trimmed.indexOf(',');
  if (trimmed.startsWith('data:') && comma >= 0) {
    return trimmed.slice(comma + 1);
  }
  return trimmed;
}

function resolveMimeType(mimeType?: string): string {
  const raw = (mimeType || 'image/jpeg').toLowerCase();
  if (raw.includes('png')) return 'image/png';
  if (raw.includes('webp')) return 'image/webp';
  return 'image/jpeg';
}

function toDataUrl(imageBase64: string, mimeType?: string): string {
  const raw = stripDataUrl(imageBase64);
  return `data:${resolveMimeType(mimeType)};base64,${raw}`;
}

function shortProviderMessage(status: number, bodyText: string): string {
  try {
    const parsed = JSON.parse(bodyText) as { error?: { message?: string } | string };
    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error.trim().slice(0, MAX_ERROR_SNIPPET);
    }
    if (parsed.error && typeof parsed.error === 'object' && parsed.error.message) {
      return String(parsed.error.message).slice(0, MAX_ERROR_SNIPPET);
    }
  } catch {
    // non-JSON body
  }
  const cleaned = bodyText.replace(/\s+/g, ' ').trim();
  if (cleaned) return cleaned.slice(0, MAX_ERROR_SNIPPET);
  return `HTTP ${status}`;
}

function extractChatContent(payload: {
  choices?: Array<{
    message?: { content?: string | null; reasoning_content?: string | null };
  }>;
}): string | null {
  const message = payload.choices?.[0]?.message;
  if (!message) return null;
  const content = typeof message.content === 'string' ? message.content.trim() : '';
  if (content) return content;
  // Thinking models may put the answer only in reasoning_content when budget is tight.
  const reasoning =
    typeof message.reasoning_content === 'string' ? message.reasoning_content.trim() : '';
  if (!reasoning) return null;
  const jsonMatch = reasoning.match(/\{[\s\S]*\}/);
  return jsonMatch?.[0] ?? null;
}

export function dishVisionConfigured(): boolean {
  if (process.env.AI_DISH_VISION_ENABLED !== 'true') return false;
  if (process.env.AI_SCAN_ENABLED !== 'true') return false;
  const provider = resolveLlmScanProvider();
  if (provider === 'yandex') {
    return Boolean(process.env.YC_AI_API_KEY && process.env.YC_FOLDER_ID);
  }
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function callDishVisionLlm(input: DishVisionLlmInput): Promise<string> {
  if (!dishVisionConfigured()) {
    throw new DishVisionProviderError(503, 'Dish vision is not configured');
  }
  const provider: LlmScanProvider = resolveLlmScanProvider();
  const prompt = buildDishVisionPrompt('ru');
  const system = dishVisionSystemInstruction();
  const dataUrl = toDataUrl(input.imageBase64, input.mimeType);

  if (provider === 'yandex') {
    return callYandexVisionChat({ system, prompt, dataUrl });
  }
  return callOpenAiVisionChat({ system, prompt, dataUrl });
}

async function callOpenAiVisionChat(input: {
  system: string;
  prompt: string;
  dataUrl: string;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (!apiKey) {
    throw new DishVisionProviderError(503, 'OPENAI_API_KEY missing');
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: input.system },
        {
          role: 'user',
          content: [
            { type: 'text', text: input.prompt },
            { type: 'image_url', image_url: { url: input.dataUrl } },
          ],
        },
      ],
    }),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    console.warn('[dish-vision] openai provider failed', { status: response.status });
    throw new DishVisionProviderError(response.status, shortProviderMessage(response.status, bodyText));
  }

  const payload = JSON.parse(bodyText) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = extractChatContent(payload);
  if (!content) {
    throw new DishVisionProviderError(502, 'Empty vision model response');
  }
  return content;
}

/**
 * Yandex AI Studio OpenAI-compatible chat with an image part.
 * Requires a multimodal model (`YC_VISION_MODEL`, default qwen3.6-35b-a3b/latest).
 */
async function callYandexVisionChat(input: {
  system: string;
  prompt: string;
  dataUrl: string;
}): Promise<string> {
  const apiKey = process.env.YC_AI_API_KEY;
  const folderId = process.env.YC_FOLDER_ID;
  const model = process.env.YC_VISION_MODEL || DEFAULT_YC_VISION_MODEL;
  if (!apiKey || !folderId) {
    throw new DishVisionProviderError(503, 'YC_AI_API_KEY / YC_FOLDER_ID missing');
  }

  const modelUri = buildYandexVisionModelUri(folderId, model);
  const endpoint =
    process.env.YC_VISION_BASE_URL?.trim() || DEFAULT_YANDEX_VISION_BASE_URL;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Api-Key ${apiKey}`,
      'x-folder-id': folderId,
      'x-data-logging-enabled': 'false',
    },
    body: JSON.stringify({
      model: modelUri,
      temperature: 0.2,
      max_tokens: 2048,
      // Qwen3.6 thinking models otherwise spend the budget on reasoning_content.
      chat_template_kwargs: { enable_thinking: false },
      messages: [
        { role: 'system', content: input.system },
        {
          role: 'user',
          content: [
            { type: 'text', text: input.prompt },
            { type: 'image_url', image_url: { url: input.dataUrl } },
          ],
        },
      ],
    }),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    // Never log API keys or base64 image payloads.
    console.warn('[dish-vision] yandex provider failed', {
      status: response.status,
      model: modelUri.replace(folderId, '<folder>'),
    });
    throw new DishVisionProviderError(response.status, shortProviderMessage(response.status, bodyText));
  }

  let payload: {
    choices?: Array<{
      message?: { content?: string | null; reasoning_content?: string | null };
    }>;
  };
  try {
    payload = JSON.parse(bodyText) as typeof payload;
  } catch {
    throw new DishVisionProviderError(502, 'Invalid JSON from vision provider');
  }

  const content = extractChatContent(payload);
  if (!content) {
    throw new DishVisionProviderError(502, 'Empty vision model response');
  }
  return content;
}
