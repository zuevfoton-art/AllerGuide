/**
 * Multimodal LLM for POST /api/scan/dish-vision (Option D).
 * Domain prompt/parse stay in @allerguide/ai; this module only talks HTTP.
 */

import {
  buildDishVisionPrompt,
  dishVisionSystemInstruction,
} from '@allerguide/ai';
import { resolveLlmScanProvider, type LlmScanProvider } from './llm-scan-provider';

const YANDEX_OPENAI_COMPAT_URL =
  'https://llm.api.cloud.yandex.net/v1/chat/completions';

/** Default VL-capable model on Yandex AI Studio (folder-scoped gpt:// URI). */
const DEFAULT_YC_VISION_MODEL = 'gemma-3-27b-it';

export interface DishVisionLlmInput {
  imageBase64: string;
  mimeType?: string;
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

export function dishVisionConfigured(): boolean {
  if (process.env.AI_DISH_VISION_ENABLED !== 'true') return false;
  if (process.env.AI_SCAN_ENABLED !== 'true') return false;
  const provider = resolveLlmScanProvider();
  if (provider === 'yandex') {
    return Boolean(process.env.YC_AI_API_KEY && process.env.YC_FOLDER_ID);
  }
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function callDishVisionLlm(input: DishVisionLlmInput): Promise<string | null> {
  if (!dishVisionConfigured()) return null;
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
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  // Prefer a vision-capable model; gpt-4o-mini accepts image_url parts.
  const model = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (!apiKey) return null;

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

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content ?? null;
}

/**
 * Yandex AI Studio OpenAI-compatible chat with an image part.
 * Requires a multimodal model (`YC_VISION_MODEL`, default gemma-3-27b-it).
 */
async function callYandexVisionChat(input: {
  system: string;
  prompt: string;
  dataUrl: string;
}): Promise<string | null> {
  const apiKey = process.env.YC_AI_API_KEY;
  const folderId = process.env.YC_FOLDER_ID;
  const model = process.env.YC_VISION_MODEL || DEFAULT_YC_VISION_MODEL;
  if (!apiKey || !folderId) return null;

  const modelUri = model.startsWith('gpt://') ? model : `gpt://${folderId}/${model}`;

  const response = await fetch(YANDEX_OPENAI_COMPAT_URL, {
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

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content ?? null;
}
