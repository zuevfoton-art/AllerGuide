import { BRAND_LOG_PREFIX } from '@/src/constants/brand';

type ErrorContext = Record<string, string>;

const SENSITIVE_EXTRA_KEYS = [
  'token',
  'password',
  'recoverykey',
  'recovery_key',
  'authorization',
  'secret',
  'jwt',
] as const;

function scrubErrorContext(context?: ErrorContext): ErrorContext | undefined {
  if (!context) return undefined;
  const out: ErrorContext = {};
  for (const [key, value] of Object.entries(context)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_EXTRA_KEYS.some((blocked) => lower.includes(blocked))) continue;
    out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

function scrubSentryEvent(event: {
  extra?: Record<string, unknown>;
  breadcrumbs?: { message?: string }[];
}): typeof event {
  if (event.extra) {
    const scrubbed = scrubErrorContext(
      Object.fromEntries(
        Object.entries(event.extra).filter(([, value]) => typeof value === 'string'),
      ) as ErrorContext,
    );
    event.extra = scrubbed;
  }
  return event;
}

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
    console.warn(`[${BRAND_LOG_PREFIX}] Sentry SDK unavailable — error reporting stays on console`);
    return;
  }

  client.init({
    dsn,
    enabled: true,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
    tracesSampleRate: 0.1,
    enableAutoSessionTracking: true,
    attachStacktrace: true,
    beforeSend: (event: { extra?: Record<string, unknown> }) => scrubSentryEvent(event),
  });
  reportingEnabled = true;
}

export function captureError(error: Error, context?: ErrorContext) {
  const safeContext = scrubErrorContext(context);
  const client = reportingEnabled ? loadSentry() : null;
  if (client) {
    client.captureException(error, { extra: safeContext });
    return;
  }
  console.error(`[${BRAND_LOG_PREFIX}]`, error, safeContext);
}

export function captureMessage(message: string, context?: ErrorContext) {
  const safeContext = scrubErrorContext(context);
  const client = reportingEnabled ? loadSentry() : null;
  if (client) {
    client.captureMessage(message, { level: 'warning', extra: safeContext });
    return;
  }
  console.warn(`[${BRAND_LOG_PREFIX}]`, message, safeContext);
}

type LogCaughtErrorLevel = 'error' | 'warn';

/** Log a caught exception without swallowing the cause (Code Complete §10). */
export function logCaughtError(
  context: string,
  error: unknown,
  options?: { level?: LogCaughtErrorLevel; extra?: ErrorContext },
): void {
  const normalized = error instanceof Error ? error : new Error(String(error));
  const safeContext = scrubErrorContext({ operation: context, ...options?.extra });
  if (options?.level === 'warn') {
    captureMessage(`${context}: ${normalized.message}`, safeContext);
    return;
  }
  captureError(normalized, safeContext);
}

/** Test-only helper for verifying Sentry wiring without sending events. */
export function __resetErrorReportingForTests() {
  reportingEnabled = false;
  sentryOverride = undefined;
}
