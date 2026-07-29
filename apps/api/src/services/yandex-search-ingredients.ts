import {
  buildIngredientsSearchQuery,
  extractIngredientsFromSearchTexts,
} from '@allerguide/ai';

const GEN_SEARCH_URL = 'https://searchapi.api.cloud.yandex.net/v2/gen/search';
const WEB_SEARCH_URL = 'https://searchapi.api.cloud.yandex.net/v2/web/search';

export type YandexIngredientsSearchResult = {
  query: string;
  productName: string;
  ingredients: string;
  source: 'yandex_gen' | 'yandex_web';
};

export function yandexSearchConfigured(): boolean {
  return (
    process.env.YC_SEARCH_ENABLED === 'true' &&
    Boolean(process.env.YC_AI_API_KEY?.trim()) &&
    Boolean(process.env.YC_FOLDER_ID?.trim())
  );
}

/**
 * Option C: find ingredient text for a dish/product name via Yandex Search API.
 * Prefers generative search; falls back to web snippets.
 */
export async function searchIngredientsWithYandex(
  productQuery: string,
): Promise<YandexIngredientsSearchResult | null> {
  if (!yandexSearchConfigured()) return null;

  const apiKey = process.env.YC_AI_API_KEY!.trim();
  const folderId = process.env.YC_FOLDER_ID!.trim();
  const query = buildIngredientsSearchQuery(productQuery);
  if (query.length < 4) return null;

  const gen = await callGenSearch(apiKey, folderId, query);
  if (gen) {
    return {
      query: productQuery.trim(),
      productName: productQuery.trim(),
      ingredients: gen,
      source: 'yandex_gen',
    };
  }

  const web = await callWebSearch(apiKey, folderId, query);
  if (web) {
    return {
      query: productQuery.trim(),
      productName: productQuery.trim(),
      ingredients: web,
      source: 'yandex_web',
    };
  }

  return null;
}

async function callGenSearch(
  apiKey: string,
  folderId: string,
  query: string,
): Promise<string | null> {
  try {
    const response = await fetch(GEN_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Api-Key ${apiKey}`,
      },
      body: JSON.stringify({
        messages: [{ content: query, role: 'ROLE_USER' }],
        folderId,
        fixMisspell: true,
        searchFilters: [{ lang: 'ru' }],
      }),
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      message?: { content?: string };
      answer?: string;
      sources?: Array<{ text?: string; title?: string }>;
    };

    const parts = [
      payload.message?.content,
      payload.answer,
      ...(payload.sources ?? []).flatMap((s) => [s.text, s.title]),
    ].filter((v): v is string => Boolean(v?.trim()));

    const ingredients = extractIngredientsFromSearchTexts(parts);
    return ingredients || null;
  } catch {
    return null;
  }
}

async function callWebSearch(
  apiKey: string,
  folderId: string,
  query: string,
): Promise<string | null> {
  try {
    const response = await fetch(WEB_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Api-Key ${apiKey}`,
      },
      body: JSON.stringify({
        query: {
          searchType: 'SEARCH_TYPE_RU',
          queryText: query,
          familyMode: 'FAMILY_MODE_MODERATE',
          fixTypoMode: 'FIX_TYPO_MODE_ON',
        },
        folderId,
        groupSpec: { groupsOnPage: 5 },
        l10n: 'LOCALIZATION_RU',
        responseFormat: 'FORMAT_XML',
      }),
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as { rawData?: string };
    if (!payload.rawData) return null;

    const xml = Buffer.from(payload.rawData, 'base64').toString('utf8');
    const passages = [...xml.matchAll(/<passage[^>]*>([\s\S]*?)<\/passage>/gi)].map((m) =>
      decodeXmlEntities(m[1] ?? ''),
    );
    const titles = [...xml.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map((m) =>
      decodeXmlEntities(m[1] ?? ''),
    );

    return extractIngredientsFromSearchTexts([...passages, ...titles]) || null;
  } catch {
    return null;
  }
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
