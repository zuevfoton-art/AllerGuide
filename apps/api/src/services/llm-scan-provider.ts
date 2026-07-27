/**
 * LLM providers for POST /api/scan.
 * Domain prompt/parse stay in @allerguide/ai; this module only talks HTTP.
 */

const SYSTEM_INSTRUCTION =
  'You analyze food and medicine ingredient lists for allergens. Reply with a single JSON object only. No markdown fences, no commentary.';

const YANDEX_COMPLETION_URL =
  'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';

export type LlmScanProvider = 'yandex' | 'openai';

export function resolveLlmScanProvider(): LlmScanProvider {
  const raw = (process.env.AI_PROVIDER || 'openai').trim().toLowerCase();
  return raw === 'yandex' ? 'yandex' : 'openai';
}

export async function callScanLlm(prompt: string): Promise<string | null> {
  if (resolveLlmScanProvider() === 'yandex') {
    return callYandexGpt(prompt);
  }
  return callOpenAiCompatible(prompt);
}

async function callOpenAiCompatible(prompt: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

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
        { role: 'system', content: SYSTEM_INSTRUCTION },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return payload.choices?.[0]?.message?.content ?? null;
}

async function callYandexGpt(prompt: string): Promise<string | null> {
  const apiKey = process.env.YC_AI_API_KEY;
  const folderId = process.env.YC_FOLDER_ID;
  const model = process.env.YC_GPT_MODEL || 'yandexgpt-lite';

  if (!apiKey || !folderId) return null;

  const modelUri = model.startsWith('gpt://') ? model : `gpt://${folderId}/${model}`;

  const response = await fetch(YANDEX_COMPLETION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Api-Key ${apiKey}`,
      'x-folder-id': folderId,
      'x-data-logging-enabled': 'false',
    },
    body: JSON.stringify({
      modelUri,
      completionOptions: {
        stream: false,
        temperature: 0.2,
        maxTokens: '2048',
      },
      messages: [
        { role: 'system', text: SYSTEM_INSTRUCTION },
        { role: 'user', text: prompt },
      ],
    }),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    result?: {
      alternatives?: Array<{ message?: { text?: string } }>;
    };
  };

  const text = payload.result?.alternatives?.[0]?.message?.text;
  return text?.trim() ? text : null;
}
