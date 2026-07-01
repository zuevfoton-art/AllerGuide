type ErrorContext = Record<string, string>;

type SentryLike = {
  init: (options: Record<string, unknown>) => void;
  captureException: (error: Error, context?: { extra?: ErrorContext }) => void;
  captureMessage: (message: string, context?: { level?: string; extra?: ErrorContext }) => void;
};

let sentryOverride: SentryLike | null | undefined;
let reportingEnabled = false;

/** @internal test helper */
export function __setSentryClientForTests(client: SentryLike | null | undefined) {
  sentryOverride = client;
  reportingEnabled = false;
}

function loadSentry(): SentryLike | null {
  if (sentryOverride !== undefined) return sentryOverride;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@sentry/react-native') as SentryLike;
  } catch {
    return null;
  }
}

function resolveDsn(): string | undefined {
  return process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || undefined;
}

export function isErrorReportingEnabled(): boolean {
  return reportingEnabled;
}

export function initErrorReporting() {
  const dsn = resolveDsn();
  if (!dsn) {
    reportingEnabled = false;
    return;
  }

  const client = loadSentry();
  if (!client) {
    reportingEnabled = false;
    console.warn('[AllerGuide] Sentry SDK unavailable — error reporting stays on console');
    return;
  }

  client.init({
    dsn,
    enabled: true,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
    tracesSampleRate: 0.1,
    enableAutoSessionTracking: true,
    attachStacktrace: true,
  });
  reportingEnabled = true;
}

export function captureError(error: Error, context?: ErrorContext) {
  const client = reportingEnabled ? loadSentry() : null;
  if (client) {
    client.captureException(error, { extra: context });
    return;
  }
  console.error('[AllerGuide]', error, context);
}

export function captureMessage(message: string, context?: ErrorContext) {
  const client = reportingEnabled ? loadSentry() : null;
  if (client) {
    client.captureMessage(message, { level: 'warning', extra: context });
    return;
  }
  console.warn('[AllerGuide]', message, context);
}

/** Test-only helper for verifying Sentry wiring without sending events. */
export function __resetErrorReportingForTests() {
  reportingEnabled = false;
  sentryOverride = undefined;
}
