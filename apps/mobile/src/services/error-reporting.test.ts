import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('error-reporting', () => {
  const captureException = vi.fn();
  const captureMessage = vi.fn();
  const init = vi.fn();

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

    const reporting = await import('./error-reporting');
    reporting.__setSentryClientForTests(fakeSentry);
  });

  it('does not initialize Sentry without DSN', async () => {
    const { initErrorReporting, isErrorReportingEnabled, captureError } = await import('./error-reporting');

    initErrorReporting();
    expect(isErrorReportingEnabled()).toBe(false);
    expect(init).not.toHaveBeenCalled();

    captureError(new Error('offline'));
    expect(captureException).not.toHaveBeenCalled();
  });

  it('initializes Sentry when DSN is configured', async () => {
    vi.stubEnv('EXPO_PUBLIC_SENTRY_DSN', 'https://example@sentry.io/1');
    vi.stubEnv('EXPO_PUBLIC_APP_ENV', 'staging');

    const { initErrorReporting, isErrorReportingEnabled } = await import('./error-reporting');
    initErrorReporting();

    expect(isErrorReportingEnabled()).toBe(true);
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://example@sentry.io/1',
        environment: 'staging',
      }),
    );
  });

  it('forwards captured errors to Sentry after init', async () => {
    vi.stubEnv('EXPO_PUBLIC_SENTRY_DSN', 'https://example@sentry.io/1');

    const { initErrorReporting, captureError } = await import('./error-reporting');
    initErrorReporting();

    const error = new Error('boom');
    captureError(error, { screen: 'diary' });

    expect(captureException).toHaveBeenCalledWith(error, { extra: { screen: 'diary' } });
  });

  it('forwards messages to Sentry as warnings', async () => {
    vi.stubEnv('EXPO_PUBLIC_SENTRY_DSN', 'https://example@sentry.io/1');

    const reporting = await import('./error-reporting');
    reporting.initErrorReporting();

    reporting.captureMessage('sync retry', { attempt: '2' });
    expect(captureMessage).toHaveBeenCalledWith('sync retry', {
      level: 'warning',
      extra: { attempt: '2' },
    });
  });

  it('strips sensitive fields from Sentry context', async () => {
    vi.stubEnv('EXPO_PUBLIC_SENTRY_DSN', 'https://example@sentry.io/1');

    const { initErrorReporting, captureError } = await import('./error-reporting');
    initErrorReporting();

    const error = new Error('auth failed');
    captureError(error, { screen: 'login', authToken: 'secret-jwt' });

    expect(captureException).toHaveBeenCalledWith(error, { extra: { screen: 'login' } });
  });
});
