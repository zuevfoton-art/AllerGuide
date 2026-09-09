/**
 * Prompt + parser for the «Ask» chat (north-star §4.9).
 *
 * The crisis guard lives in `@allerguide/core` (`detectAskDistress`) and runs
 * before this module on both client and server, so the prompt only has to cover
 * the ordinary explainer case. The provider is shared with the scanner and is
 * JSON-only, hence the `{"answer": "..."}` envelope.
 */

export const ASK_ANSWER_MAX_LENGTH = 1_200;

export interface AskChatPromptInput {
  question: string;
  /** BCP-47 tag of the app UI — the answer must come back in this language. */
  locale: string;
  /** Optional plain-language state lines, e.g. «Пыльца: много». */
  context?: string[];
  /** Previous turns, oldest first, already trimmed by the caller. */
  history?: { role: 'user' | 'assistant'; text: string }[];
}

export function buildAskChatPrompt(input: AskChatPromptInput): string {
  const lines = [
    'Ты — помощник приложения для людей с аллергией.',
    'Отвечай спокойно, короткими предложениями, максимум 4 предложения.',
    `Язык ответа: ${input.locale}.`,
    'Правила:',
    '- ты не врач: не ставишь диагноз, не назначаешь дозы и не отменяешь назначения;',
    '- при описании тяжёлых симптомов не советуй — направляй в скорую (103/112);',
    '- если данных не хватает, скажи это прямо и предложи, что посмотреть в приложении;',
    '- никаких обещаний «безопасно»: говори про вероятность и про проверку состава.',
    'Ответь ТОЛЬКО JSON без markdown: {"answer":"текст"}',
  ];

  if (input.context?.length) {
    lines.push(`Состояние сегодня: ${input.context.join('; ')}`);
  }

  for (const turn of input.history ?? []) {
    lines.push(`${turn.role === 'user' ? 'Вопрос' : 'Ответ'}: ${turn.text}`);
  }

  lines.push(`Вопрос: ${input.question}`);
  return lines.join('\n');
}

export function parseAskChatAnswer(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;

  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as { answer?: unknown };
    if (typeof parsed.answer === 'string' && parsed.answer.trim()) {
      return parsed.answer.trim().slice(0, ASK_ANSWER_MAX_LENGTH);
    }
  } catch {
    // A provider that ignored the envelope still gave usable prose.
  }

  // Reject a leftover JSON husk; anything else is treated as the answer itself.
  if (cleaned.startsWith('{') || cleaned.startsWith('[')) return null;
  return cleaned.slice(0, ASK_ANSWER_MAX_LENGTH);
}
