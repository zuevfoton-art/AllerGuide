type ErrorContext = Record<string, string>;

export function initErrorReporting() {}

export function captureError(error: Error, context?: ErrorContext) {
  console.error('[AllerGuide]', error, context);
}

export function captureMessage(message: string, context?: ErrorContext) {
  console.warn('[AllerGuide]', message, context);
}
