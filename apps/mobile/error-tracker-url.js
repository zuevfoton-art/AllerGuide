/**
 * GlitchTip (Sentry-protocol) ingest must stay on our host.
 * Shared by Expo app.config.js (CJS) and tests.
 */

function parseCrashTrackerUrl(raw) {
  const url = typeof raw === 'string' ? raw.trim() : '';
  if (!url) return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function isDisallowedCrashIngestHost(hostname) {
  const host = String(hostname || '')
    .trim()
    .toLowerCase();
  return host === 'sentry.io' || host.endsWith('.sentry.io');
}

function isSelfHostedCrashTrackerUrl(raw) {
  const parsed = parseCrashTrackerUrl(raw);
  if (!parsed) return false;
  const host = parsed.hostname.toLowerCase();
  if (!host) return false;
  if (isDisallowedCrashIngestHost(host)) return false;
  return true;
}

/** Envelope DSN: https://<publicKey>@host/<projectId>, never sentry.io. */
function isValidCrashIngestDsn(raw) {
  if (!isSelfHostedCrashTrackerUrl(raw)) return false;
  const parsed = parseCrashTrackerUrl(raw);
  if (!parsed) return false;
  if (parsed.protocol !== 'https:') return false;
  if (!parsed.username) return false;
  const projectPath = parsed.pathname.replace(/\/+$/, '');
  if (!projectPath || projectPath === '/') return false;
  return true;
}

function crashIngestHostname(raw) {
  const parsed = parseCrashTrackerUrl(raw);
  const host = parsed?.hostname?.toLowerCase() ?? '';
  return host;
}

module.exports = {
  isSelfHostedCrashTrackerUrl,
  isValidCrashIngestDsn,
  crashIngestHostname,
};
