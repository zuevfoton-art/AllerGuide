export function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === 'string' ? value : String(value));
}

/** Log a caught exception without swallowing the cause (Code Complete §10). */
export function logCaughtError(context: string, error: unknown, extra?: Record<string, unknown>): void {
  console.error(`[api] ${context}`, toError(error), extra ?? '');
}
