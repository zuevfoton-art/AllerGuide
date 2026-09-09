/**
 * «Ask» chat domain rules (north-star §4.9).
 *
 * The assistant is a second-line explainer, never the crisis path: a message
 * that sounds like anaphylaxis is answered by handing the user to the emergency
 * screen, and the model is not called at all. Everything here is offline-safe so
 * the guard works with no network.
 */

export const ASK_MAX_QUESTION_LENGTH = 500;
export const ASK_MAX_HISTORY_MESSAGES = 50;

export const ASK_SUGGESTION_IDS = ['air', 'traces', 'pollen'] as const;

export type AskSuggestionId = (typeof ASK_SUGGESTION_IDS)[number];

export type AskRole = 'user' | 'assistant';

export type AskMessage = {
  id: string;
  role: AskRole;
  text: string;
  at: string;
  /** Assistant turn that refused to answer and pointed at the crisis screen. */
  handoff?: boolean;
};

/**
 * Distress lexicon across the six shipped locales. Deliberately broad: a false
 * handoff costs one extra tap, a missed one costs much more. Substring matching
 * covers RU inflections («задыхаюсь», «задыхается») without a stemmer.
 */
const DISTRESS_PATTERNS = [
  // ru
  'задыха',
  'не могу дышать',
  'нечем дышать',
  'анафилакс',
  'отек горла',
  'отёк горла',
  'отек языка',
  'отёк языка',
  'теряю сознание',
  'потерял сознание',
  'теряет сознание',
  'скорая',
  'адреналин',
  'эпипен',
  'судорог',
  'посинел',
  // en
  'cannot breathe',
  "can't breathe",
  'cant breathe',
  'struggling to breathe',
  'anaphyla',
  'throat closing',
  'throat is closing',
  'swollen throat',
  'swollen tongue',
  'passing out',
  'unconscious',
  'epipen',
  'epinephrine',
  'adrenaline',
  'ambulance',
  // de
  'kann nicht atmen',
  'atemnot',
  'anaphyla',
  'rettungsdienst',
  'krankenwagen',
  // fr
  'je ne peux pas respirer',
  'du mal a respirer',
  'du mal à respirer',
  'anaphyla',
  'gorge qui se ferme',
  'samu',
  // es
  'no puedo respirar',
  'dificultad para respirar',
  'anafila',
  'garganta cerrada',
  'ambulancia',
  // it
  'non riesco a respirare',
  'non posso respirare',
  'anafila',
  'gola chiusa',
  'ambulanza',
] as const;

/** Diacritic-insensitive, case-insensitive normalization for the guard. */
function normalizeForGuard(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300\u0301\u0302\u0303\u0308\u0327]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when the message must go to the crisis screen instead of the model. */
export function detectAskDistress(text: string): boolean {
  const normalized = normalizeForGuard(text);
  if (!normalized) return false;
  return DISTRESS_PATTERNS.some((pattern) => normalized.includes(normalizeForGuard(pattern)));
}

export type AskQuestionRejection = 'empty' | 'too-long';

export type AskQuestionParse =
  | { ok: true; text: string; distress: boolean }
  | { ok: false; reason: AskQuestionRejection };

export function parseAskQuestion(raw: string): AskQuestionParse {
  const text = raw.trim();
  if (!text) return { ok: false, reason: 'empty' };
  if (text.length > ASK_MAX_QUESTION_LENGTH) return { ok: false, reason: 'too-long' };
  return { ok: true, text, distress: detectAskDistress(text) };
}

export type AskLengthBucket = 'short' | 'medium' | 'long';

/** Coarse size bucket — the only thing about a message that may reach analytics. */
export function askLengthBucket(text: string): AskLengthBucket {
  const length = text.trim().length;
  if (length <= 40) return 'short';
  if (length <= 160) return 'medium';
  return 'long';
}

/** Trims local history to the retained window, keeping the newest turns. */
export function trimAskHistory(
  messages: AskMessage[],
  limit = ASK_MAX_HISTORY_MESSAGES,
): AskMessage[] {
  if (messages.length <= limit) return messages;
  return messages.slice(messages.length - limit);
}
