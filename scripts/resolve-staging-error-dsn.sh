#!/usr/bin/env bash
# Bake GlitchTip EXPO_PUBLIC_ERROR_DSN into the Gradle staging APK (GITHUB_ENV).
# Prefer GitHub secrets; otherwise EAS env (staging profile uses preview).
# Never prints the DSN. Missing DSN warns and still allows the APK to assemble.
#
# Used by .github/workflows/staging-apk-gradle.yml
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TRACKER="$ROOT/apps/mobile/error-tracker-url.js"
EXPECTED_HOST="${STAGING_GLITCHTIP_HOST:-errors.staging.aclearo.com}"

if [ ! -f "$TRACKER" ]; then
  echo "Missing $TRACKER" >&2
  exit 1
fi

if [ -z "${GITHUB_ENV:-}" ]; then
  echo "GITHUB_ENV is required (GitHub Actions env file)." >&2
  exit 1
fi

is_valid_crash_dsn() {
  CANDIDATE="${1:-}" node -e 'const { isValidCrashIngestDsn } = require(process.argv[1]); process.exit(isValidCrashIngestDsn(process.env.CANDIDATE) ? 0 : 1)' "$TRACKER"
}

dsn_host() {
  CANDIDATE="${1:-}" node -e 'const { crashIngestHostname } = require(process.argv[1]); process.stdout.write(crashIngestHostname(process.env.CANDIDATE) || "")' "$TRACKER"
}

DSN=""
SOURCE=""

try_candidate() {
  local value="${1:-}"
  local label="${2:-}"
  if [ -z "$value" ]; then
    return 1
  fi
  if is_valid_crash_dsn "$value"; then
    DSN="$value"
    SOURCE="$label"
    return 0
  fi
  echo "::warning::${label} is set but is not a self-hosted GlitchTip DSN (https://<key>@host/<project>, not sentry.io)."
  return 1
}

fetch_eas_dsn() {
  local env_name="$1"
  local var_name="$2"
  if [ -n "${RESOLVE_STAGING_ERROR_DSN_EAS_GET:-}" ]; then
    "${RESOLVE_STAGING_ERROR_DSN_EAS_GET}" "$env_name" "$var_name"
    return
  fi
  (
    cd "$ROOT/apps/mobile"
    pnpm exec eas env:get "$env_name" \
      --variable-name "$var_name" \
      --format short \
      --non-interactive
  )
}

try_candidate "${EXPO_PUBLIC_ERROR_DSN:-}" "github-secret:EXPO_PUBLIC_ERROR_DSN" || \
  try_candidate "${EXPO_PUBLIC_SENTRY_DSN:-}" "github-secret:EXPO_PUBLIC_SENTRY_DSN" ||
  true

if [ -z "$DSN" ] && { [ -n "${EXPO_TOKEN:-}" ] || [ -n "${RESOLVE_STAGING_ERROR_DSN_EAS_GET:-}" ]; }; then
  echo "Trying EAS project env for crash DSN…"
  for ENV_NAME in preview staging production development; do
    for VAR_NAME in EXPO_PUBLIC_ERROR_DSN EXPO_PUBLIC_SENTRY_DSN; do
      set +e
      VAL="$(fetch_eas_dsn "$ENV_NAME" "$VAR_NAME" 2>/tmp/eas-error-dsn.err | tr -d '\r')"
      EAS_RC=$?
      set -e
      VAL="$(printf '%s' "${VAL:-}" | tail -n 1 | tr -d '[:space:]')"
      if [ "$EAS_RC" -ne 0 ]; then
        echo "EAS env:get ${ENV_NAME}/${VAR_NAME} failed (rc=${EAS_RC}): $(tr '\n' ' ' </tmp/eas-error-dsn.err | head -c 200)"
        continue
      fi
      if try_candidate "$VAL" "eas:${ENV_NAME}:${VAR_NAME}"; then
        break 2
      fi
    done
  done
fi

if [ -n "$DSN" ]; then
  HOST="$(dsn_host "$DSN")"
  if [ "$HOST" != "$EXPECTED_HOST" ]; then
    echo "::warning::Crash DSN host is ${HOST}; staging ingest is ${EXPECTED_HOST}."
  fi
  {
    echo "EXPO_PUBLIC_ERROR_DSN<<EOF"
    echo "$DSN"
    echo "EOF"
    echo "EXPO_PUBLIC_SENTRY_DSN<<EOF"
    echo "$DSN"
    echo "EOF"
    echo "STAGING_ERROR_DSN_SOURCE=${SOURCE}"
    echo "STAGING_ERROR_DSN_HOST=${HOST}"
  } >> "$GITHUB_ENV"
  echo "Crash ingest enabled (host=${HOST} source=${SOURCE})."
else
  {
    echo "EXPO_PUBLIC_ERROR_DSN="
    echo "EXPO_PUBLIC_SENTRY_DSN="
    echo "STAGING_ERROR_DSN_SOURCE=none"
    echo "STAGING_ERROR_DSN_HOST="
  } >> "$GITHUB_ENV"
  echo "::warning::No valid EXPO_PUBLIC_ERROR_DSN. Staging APK will not send crash envelopes to GlitchTip."
  echo "Set repo secret EXPO_PUBLIC_ERROR_DSN (or EAS preview Sensitive) to https://<key>@${EXPECTED_HOST}/<id>."
  echo "See docs/staging-glitchtip.md and docs/android-stage-build.md §C."
fi
