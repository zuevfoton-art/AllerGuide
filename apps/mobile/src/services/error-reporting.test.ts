import { beforeEach, describe, expect, it, vi } from 'vitest';

const GLITCHTIP_DSN = 'https://key@errors.staging.aclearo.com/1';

describe('error-reporting', () => {
  const captureException = vi.fn();
  const captureMessage = vi.fn();
  const init = vi.fn();
  const crashAnalytics = vi.fn();

  const fakeSentry = {
    init,
    captureException,
    captureMessage,
  };

  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    captureException.mockReset();
    captureMessage.mockReset();
    init.mockReset();
    crashAnalytics.mockReset();

    const reporting = await import('./error-reporting');
    reporting.__setSentryClientForTests(fakeSentry);
    reporting.setCrashAnalyticsSink(crashAnalytics);
  });

  it('does not initialize without DSN', async () => {
    const { initErrorReporting, isErrorReportingEnabled, captureError } = await import('./error-reporting');

    initErrorReporting();
    expect(isErrorReportingEnabled()).toBe(false);
    expect(init).not.toHaveBeenCalled();

    captureError(new Error('offline'));
    expect(captureException).not.toHaveBeenCalled();
  });

  it('refuses a sentry.io DSN', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('EXPO_PUBLIC_SENTRY_DSN', 'https://example@sentry.io/1');

    const { initErrorReporting, isErrorReportingEnabled } = await import('./error-reporting');
    initErrorReporting();

    expect(isErrorReportingEnabled()).toBe(false);
    expect(init).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('prefers EXPO_PUBLIC_ERROR_DSN over the Sentry-named alias', async () => {
    vi.stubEnv('EXPO_PUBLIC_SENTRY_DSN', 'https://legacy@errors.staging.aclearo.com/9');
    vi.stubEnv('EXPO_PUBLIC_ERROR_DSN', GLITCHTIP_DSN);
    vi.stubEnv('EXPO_PUBLIC_APP_ENV', 'staging');

    const { initErrorReporting, isErrorReportingEnabled } = await import('./error-reporting');
    initErrorReporting();

    expect(isErrorReportingEnabled()).toBe(true);
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: GLITCHTIP_DSN,
        environment: 'staging',
        tracesSampleRate: 0,
        enableAutoSessionTracking: false,
        autoSessionTracking: false,
      }),
    );
  });

  it('initializes when a self-hosted DSN is configured', async () => {
    vi.stubEnv('EXPO_PUBLIC_SENTRY_DSN', GLITCHTIP_DSN);
    vi.stubEnv('EXPO_PUBLIC_APP_ENV', 'staging');

    const { initErrorReporting, isErrorReportingEnabled } = await import('./error-reporting');
    initErrorReporting();

    expect(isErrorReportingEnabled()).toBe(true);
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: GLITCHTIP_DSN,
        environment: 'staging',
      }),
    );
  });

  it('forwards captured errors to the SDK after init', async () => {
    vi.stubEnv('EXPO_PUBLIC_SENTRY_DSN', GLITCHTIP_DSN);

    const { initErrorReporting, captureError } = await import('./error-reporting');
    initErrorReporting();

    const error = new Error('boom');
    captureError(error, { screen: 'diary' });

    expect(captureException).toHaveBeenCalledWith(error, { extra: { screen: 'diary' } });
    expect(crashAnalytics).not.toHaveBeenCalled();
  });

  it('emits crash analytics only for fatal captures', async () => {
    vi.stubEnv('EXPO_PUBLIC_SENTRY_DSN', GLITCHTIP_DSN);

    const { initErrorReporting, captureError } = await import('./error-reporting');
    initErrorReporting();

    captureError(new Error('boundary'), { screen: 'root' }, { fatal: true });

    expect(crashAnalytics).toHaveBeenCalledWith(true);
  });

  it('forwards messages as warnings', async () => {
    vi.stubEnv('EXPO_PUBLIC_SENTRY_DSN', GLITCHTIP_DSN);

    const reporting = await import('./error-reporting');
    reporting.initErrorReporting();

    reporting.captureMessage('sync retry', { attempt: '2' });
    expect(captureMessage).toHaveBeenCalledWith('sync retry', {
      level: 'warning',
      extra: { attempt: '2' },
    });
  });

  it('strips sensitive fields including user and profile ids', async () => {
    vi.stubEnv('EXPO_PUBLIC_SENTRY_DSN', GLITCHTIP_DSN);

    const { initErrorReporting, captureError } = await import('./error-reporting');
    initErrorReporting();

    const error = new Error('auth failed');
    captureError(error, {
      screen: 'login',
      authToken: 'secret-jwt',
      userId: '1',
      profile_id: '9',
    });

    expect(captureException).toHaveBeenCalledWith(error, { extra: { screen: 'login' } });
  });

  it('logCaughtError forwards errors to captureError by default without treating them as fatal', async () => {
    vi.stubEnv('EXPO_PUBLIC_SENTRY_DSN', GLITCHTIP_DSN);

    const { initErrorReporting, logCaughtError } = await import('./error-reporting');
    initErrorReporting();

    const error = new Error('network down');
    logCaughtError('uploadBackup', error, { extra: { userId: '1' } });

    expect(captureException).toHaveBeenCalledWith(error, {
      extra: { operation: 'uploadBackup' },
    });
    expect(crashAnalytics).not.toHaveBeenCalled();
  });

  it('logCaughtError uses captureMessage for warn level', async () => {
    vi.stubEnv('EXPO_PUBLIC_SENTRY_DSN', GLITCHTIP_DSN);

    const { initErrorReporting, logCaughtError } = await import('./error-reporting');
    initErrorReporting();

    logCaughtError('readPollenCache', new Error('bad json'), { level: 'warn' });

    expect(captureMessage).toHaveBeenCalledWith('readPollenCache: bad json', {
      level: 'warning',
      extra: { operation: 'readPollenCache' },
    });
    expect(captureException).not.toHaveBeenCalled();
  });

  it('classifies sentry.io hosts as disallowed ingest', async () => {
    const { isDisallowedCrashIngestHost, hostnameFromCrashDsn } = await import('./error-reporting');
    expect(isDisallowedCrashIngestHost('sentry.io')).toBe(true);
    expect(isDisallowedCrashIngestHost('o123.ingest.sentry.io')).toBe(true);
    expect(isDisallowedCrashIngestHost('errors.staging.aclearo.com')).toBe(false);
    expect(hostnameFromCrashDsn(GLITCHTIP_DSN)).toBe('errors.staging.aclearo.com');
  });
});
