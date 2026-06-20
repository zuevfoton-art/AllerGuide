type ErrorContext = Record<string, string>;

let sentryReady = false;

export function initErrorReporting() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn || sentryReady) return;

  void import('@sentry/react-native')
    .then((Sentry) => {
      Sentry.init({
        dsn,
        enabled: typeof __DEV__ === 'boolean' ? !__DEV__ : true,
        tracesSampleRate: 0.2,
      });
      sentryReady = true;
    })
    .catch((error) => {
      console.warn('[error-reporting] Sentry init skipped', error);
    });
}

export function captureError(error: Error, context?: ErrorContext) {
  console.error('[AllerGuide]', error, context);

  if (!sentryReady) return;

  void import('@sentry/react-native')
    .then((Sentry) => {
      Sentry.captureException(error, { extra: context });
    })
    .catch(() => undefined);
}

export function captureMessage(message: string, context?: ErrorContext) {
  console.warn('[AllerGuide]', message, context);

  if (!sentryReady) return;

  void import('@sentry/react-native')
    .then((Sentry) => {
      Sentry.captureMessage(message, { extra: context });
    })
    .catch(() => undefined);
}
