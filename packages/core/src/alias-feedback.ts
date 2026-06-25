import { mapExternalAllergenToId } from './allergen-aliases';

export type AliasFeedbackStatus = 'pending' | 'reviewed' | 'merged' | 'rejected';

export interface AliasFeedbackEntry {
  id: string;
  /** Raw term that failed to map or was mis-mapped during scan. */
  term: string;
  /** Suggested canonical allergen id (optional user hint). */
  suggestedAllergenId?: string;
  /** Barcode or scan context. */
  context?: string;
  profileId?: number;
  scanInput?: string;
  status: AliasFeedbackStatus;
  createdAt: string;
}

export interface AliasFeedbackInput {
  term: string;
  suggestedAllergenId?: string;
  context?: string;
  profileId?: number;
  scanInput?: string;
}

let feedbackSeq = 0;

function nextId(): string {
  feedbackSeq += 1;
  return `alias-${Date.now()}-${feedbackSeq}`;
}

/** In-memory queue for tests and API batching; mobile persists to SQLite. */
const queue: AliasFeedbackEntry[] = [];

export function enqueueAliasFeedback(input: AliasFeedbackInput): AliasFeedbackEntry {
  const normalized = input.term.trim();
  const suggested = input.suggestedAllergenId?.trim();

  const entry: AliasFeedbackEntry = {
    id: nextId(),
    term: normalized,
    suggestedAllergenId: suggested || undefined,
    context: input.context?.trim() || undefined,
    profileId: input.profileId,
    scanInput: input.scanInput?.trim() || undefined,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  queue.push(entry);
  return entry;
}

export function listAliasFeedback(status?: AliasFeedbackStatus): AliasFeedbackEntry[] {
  if (!status) return [...queue];
  return queue.filter((item) => item.status === status);
}

export function resolveAliasFeedback(id: string, status: AliasFeedbackStatus): AliasFeedbackEntry | null {
  const entry = queue.find((item) => item.id === id);
  if (!entry) return null;
  entry.status = status;
  return entry;
}

/** Clear queue — test helper. */
export function resetAliasFeedbackQueue(): void {
  queue.length = 0;
  feedbackSeq = 0;
}

/**
 * Whether a scan term looks like an unmapped external allergen worth reporting.
 */
export function shouldSuggestAliasFeedback(term: string): boolean {
  const trimmed = term.trim();
  if (trimmed.length < 2) return false;
  return !mapExternalAllergenToId(trimmed);
}
