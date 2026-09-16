import { BRAND_LOG_PREFIX } from '@/src/constants/brand';

export type ErrorContext = Record<string, string>;

export type LogCaughtErrorLevel = 'error' | 'warn';

export type CaptureErrorOptions = {
  /** Unhandled / ErrorBoundary crash. Counted in G5 crash-free. */
  fatal?: boolean;
};

const SENSITIVE_EXTRA_KEYS = [
  'token',
  'password',
  'recoverykey',
  'recovery_key',
  'authorization',
  'secret',
  'jwt',
  'userid',
  'user_id',
  'profileid',
  'profile_id',
] as const;

/** Hosts we must never send envelopes to (data stays on Yandex Cloud). */
export function isDisallowedCrashIngestHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  return host === 'sentry.io' || host.endsWith('.sentry.io');
}

export function hostnameFromCrashDsn(dsn: string): string | undefined {
  try {
    const host = new URL(dsn).hostname;
    return host ? host.toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}

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
let crashAnalyticsSink: ((fatal: boolean) => void) | null = null;

/** Wired from analytics-service so crash ingest does not import analytics (cycle). */
export function setCrashAnalyticsSink(sink: ((fatal: boolean) => void) | null) {
  crashAnalyticsSink = sink;
}

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
  const raw =
    process.env.EXPO_PUBLIC_ERROR_DSN?.trim() || process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!raw) return undefined;

  const hostname = hostnameFromCrashDsn(raw);
  if (!hostname) {
    console.warn(`[${BRAND_LOG_PREFIX}] Crash DSN is not a valid URL — error reporting stays off`);
    return undefined;
  }
  if (isDisallowedCrashIngestHost(hostname)) {
    console.warn(
      `[${BRAND_LOG_PREFIX}] Crash DSN points at sentry.io — refused. Use self-hosted GlitchTip (docs/staging-glitchtip.md)`,
    );
    return undefined;
  }
  return raw;
}

function emitFatalCrashAnalytics() {
  try {
    crashAnalyticsSink?.(true);
  } catch {
    // Analytics is optional; crash reporting must not throw.
  }
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
    tracesSampleRate: 0,
    enableAutoSessionTracking: false,
    autoSessionTracking: false,
    attachStacktrace: true,
    beforeSend: (event: { extra?: Record<string, unknown> }) => scrubSentryEvent(event),
  });
  reportingEnabled = true;
}

export function captureError(error: Error, context?: ErrorContext, options?: CaptureErrorOptions) {
  const safeContext = scrubErrorContext(context);
  const client = reportingEnabled ? loadSentry() : null;
  if (options?.fatal) {
    emitFatalCrashAnalytics();
  }
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

export function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === 'string' ? value : String(value));
}

/** Log a caught exception without swallowing the cause (Code Complete §10). */
export function logCaughtError(
  context: string,
  error: unknown,
  options?: { level?: LogCaughtErrorLevel; extra?: ErrorContext },
): void {
  const normalized = toError(error);
  const safeContext = scrubErrorContext({ operation: context, ...options?.extra });
  if (options?.level === 'warn') {
    captureMessage(`${context}: ${normalized.message}`, safeContext);
    return;
  }
  captureError(normalized, safeContext);
}

/** Test-only helper for verifying crash ingest wiring without sending events. */
export function __resetErrorReportingForTests() {
  reportingEnabled = false;
  sentryOverride = undefined;
  crashAnalyticsSink = null;
}
