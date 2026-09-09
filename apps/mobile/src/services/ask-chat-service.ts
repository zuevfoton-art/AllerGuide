import {
  ASK_SUGGESTION_IDS,
  askLengthBucket,
  getExpertArticle,
  parseAskQuestion,
  trimAskHistory,
  type AskMessage,
  type AskSuggestionId,
} from '@allerguide/core';
import { AI_CHAT_ENABLED } from '@/src/constants/features';
import { apiRequest } from '@/src/services/api-client';
import { trackEvent } from '@/src/services/analytics-service';
import { getSetting, setSetting } from '@/src/services/settings-service';

const HISTORY_KEY = 'askChatHistory';

export const ASK_OFFLINE_ARTICLE_BY_SUGGESTION: Record<AskSuggestionId, string> = {
  air: 'pollinosis-basics',
  traces: 'food-allergy-tips',
  pollen: 'pollinosis-basics',
};

export type AskOfflineCard = {
  articleId: string;
  title: string;
  summary: string;
};

export type AskTurnResult =
  | { ok: false; reason: 'empty' | 'too-long' }
  | { ok: true; question: AskMessage; reply: AskMessage; handoff: boolean; offline: boolean };

type AskApiResponse = {
  ok?: boolean;
  answer?: string;
  handoff?: 'sos';
};

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseStoredHistory(raw: string | null): AskMessage[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const messages: AskMessage[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Partial<AskMessage>;
      if (row.role !== 'user' && row.role !== 'assistant') continue;
      if (typeof row.id !== 'string' || typeof row.text !== 'string' || typeof row.at !== 'string') continue;
      messages.push({
        id: row.id,
        role: row.role,
        text: row.text,
        at: row.at,
        handoff: row.handoff === true,
      });
    }
    return trimAskHistory(messages);
  } catch {
    return [];
  }
}

export function loadAskHistory(): AskMessage[] {
  return parseStoredHistory(getSetting(HISTORY_KEY));
}

export function saveAskHistory(messages: AskMessage[]) {
  setSetting(HISTORY_KEY, JSON.stringify(trimAskHistory(messages)));
}

export function clearAskHistory() {
  setSetting(HISTORY_KEY, '[]');
}

export function buildAskOfflineCards(): AskOfflineCard[] {
  const seen = new Set<string>();
  const cards: AskOfflineCard[] = [];
  for (const suggestion of ASK_SUGGESTION_IDS) {
    const articleId = ASK_OFFLINE_ARTICLE_BY_SUGGESTION[suggestion];
    if (seen.has(articleId)) continue;
    seen.add(articleId);
    const article = getExpertArticle(articleId);
    if (!article) continue;
    cards.push({ articleId, title: article.title, summary: article.summary });
  }
  return cards;
}

export function trackAskOpened() {
  trackEvent('ai_chat_opened');
}

/**
 * Guard + optional LLM turn. Distress never reaches the model; a network miss
 * is an offline turn with local expert cards instead of a blank error.
 */
export async function sendAskQuestion(input: {
  raw: string;
  locale: string;
  context?: string[];
  history: AskMessage[];
  fallbackAnswer: string;
}): Promise<AskTurnResult> {
  const parsed = parseAskQuestion(input.raw);
  if (!parsed.ok) return parsed;

  const question: AskMessage = {
    id: newId(),
    role: 'user',
    text: parsed.text,
    at: new Date().toISOString(),
  };

  if (parsed.distress) {
    trackEvent('ai_chat_handoff_sos', { length_bucket: askLengthBucket(parsed.text) });
    return {
      ok: true,
      question,
      reply: {
        id: newId(),
        role: 'assistant',
        text: '',
        at: new Date().toISOString(),
        handoff: true,
      },
      handoff: true,
      offline: false,
    };
  }

  if (AI_CHAT_ENABLED) {
    const history = input.history
      .filter((message) => !message.handoff && message.text)
      .slice(-6)
      .map((message) => ({ role: message.role, text: message.text }));

    const response = await apiRequest<AskApiResponse>('/api/ask', {
      method: 'POST',
      body: {
        question: parsed.text,
        locale: input.locale,
        context: input.context ?? [],
        history,
      },
    });

    if (response.ok && response.data.handoff === 'sos') {
      trackEvent('ai_chat_handoff_sos', { length_bucket: askLengthBucket(parsed.text) });
      return {
        ok: true,
        question,
        reply: {
          id: newId(),
          role: 'assistant',
          text: '',
          at: new Date().toISOString(),
          handoff: true,
        },
        handoff: true,
        offline: false,
      };
    }

    if (response.ok && response.data.answer?.trim()) {
      return {
        ok: true,
        question,
        reply: {
          id: newId(),
          role: 'assistant',
          text: response.data.answer.trim(),
          at: new Date().toISOString(),
        },
        handoff: false,
        offline: false,
      };
    }
  }

  return {
    ok: true,
    question,
    reply: {
      id: newId(),
      role: 'assistant',
      text: input.fallbackAnswer,
      at: new Date().toISOString(),
    },
    handoff: false,
    offline: true,
  };
}
