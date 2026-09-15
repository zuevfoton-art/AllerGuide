/**
 * GlitchTip (Sentry-protocol) ingest must stay on our host.
 * Shared by Expo app.config.js (CJS) and tests.
 */

function isSelfHostedCrashTrackerUrl(raw) {
  const url = typeof raw === 'string' ? raw.trim() : '';
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (!host) return false;
    if (host === 'sentry.io' || host.endsWith('.sentry.io')) return false;
    return true;
  } catch {
    return false;
  }
}

module.exports = { isSelfHostedCrashTrackerUrl };
