#!/usr/bin/env bash
# Phase 0 gate: staging must work on Yandex Cloud without depending on Replit.
# See docs/migrate-off-replit-to-yc.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STAGING_API_URL="${STAGING_API_URL:-https://api.staging.aclearo.com}"
STAGING_API_URL="${STAGING_API_URL%/}"
STAGING_API_URL_RU="${STAGING_API_URL_RU:-https://api.staging.aclearo.ru}"
STAGING_API_URL_RU="${STAGING_API_URL_RU%/}"
EXPECTED_EAS_API_URL="https://api.staging.aclearo.com"

FAILED=0
WARNED=0

pass() { echo "  PASS  $*"; }
fail() { echo "  FAIL  $*"; FAILED=$((FAILED + 1)); }
warn() { echo "  WARN  $*"; WARNED=$((WARNED + 1)); }

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 2
  fi
}

need_cmd curl
need_cmd jq
need_cmd node

echo "=== YC stage Phase 0 gate ==="
echo "Primary API: $STAGING_API_URL"
echo ""

# --- P0.5 EAS staging URL (static) ---
echo "--- P0.5 EAS profile staging ---"
EAS_STAGING_URL="$(
  node -e '
    const eas = require("./apps/mobile/eas.json");
    const url = eas?.build?.staging?.env?.EXPO_PUBLIC_API_URL;
    if (!url) process.exit(3);
    process.stdout.write(String(url));
  '
)" || {
  fail "apps/mobile/eas.json: build.staging.env.EXPO_PUBLIC_API_URL missing"
  EAS_STAGING_URL=""
}

if [[ -n "$EAS_STAGING_URL" ]]; then
  if [[ "$EAS_STAGING_URL" == "$EXPECTED_EAS_API_URL" ]]; then
    pass "eas.json staging EXPO_PUBLIC_API_URL=$EAS_STAGING_URL"
  else
    fail "eas.json staging EXPO_PUBLIC_API_URL=$EAS_STAGING_URL (expected $EXPECTED_EAS_API_URL)"
  fi
  if [[ "$EAS_STAGING_URL" == *replit.app* ]]; then
    fail "eas.json staging points at Replit"
  fi
fi

EAS_POLLEN_FLAG="$(
  node -e '
    const eas = require("./apps/mobile/eas.json");
    process.stdout.write(String(eas?.build?.staging?.env?.EXPO_PUBLIC_POLLEN_HEATMAP ?? "off"));
  '
)"
echo "  info  EAS staging EXPO_PUBLIC_POLLEN_HEATMAP=$EAS_POLLEN_FLAG"

# EAS replit profile must be gone after Phase 3.
if node -e 'const e=require("./apps/mobile/eas.json"); process.exit(e.build?.replit ? 0 : 1)'; then
  fail "eas.json still has profile \"replit\" (remove in Phase 3)"
else
  pass "eas.json has no profile \"replit\""
fi

echo ""

# --- P0.6 stage automation must not target Replit ---
echo "--- P0.6 stage scripts / workflows ---"
REPLIT_HITS="$(
  {
    grep -RIn --exclude-dir=node_modules -E 'replit\.app' scripts/staging-*.sh 2>/dev/null || true
    grep -RIn --exclude-dir=node_modules -E 'replit\.app' .github/workflows/*staging* 2>/dev/null || true
    grep -RIn --exclude-dir=node_modules -E 'replit\.app' .github/workflows/deploy-staging*.yml 2>/dev/null || true
    grep -RIn --exclude-dir=node_modules -E 'replit\.app' .github/workflows/eas-staging*.yml 2>/dev/null || true
  } | sort -u || true
)"
if [[ -z "${REPLIT_HITS//[[:space:]]/}" ]]; then
  pass "no replit.app in staging scripts/workflows"
else
  fail "replit.app found in staging automation:"
  echo "$REPLIT_HITS" >&2
fi

# staging-preflight / staging-smoke default host
DEFAULT_SMOKE_URL="$(
  grep -E 'STAGING_API_URL:-https://api\.staging\.aclearo\.com' scripts/staging-preflight.sh scripts/staging-smoke.sh \
    >/dev/null && echo ok || echo bad
)"
if [[ "$DEFAULT_SMOKE_URL" == "ok" ]]; then
  pass "staging-preflight/smoke default to api.staging.aclearo.com"
else
  fail "staging-preflight/smoke defaults must use api.staging.aclearo.com"
fi

echo ""

check_health() {
  local label="$1"
  local base="$2"
  local response http_code

  echo "--- $label ($base) ---"
  http_code="$(curl -sS -o /tmp/yc-phase0-health.json -w '%{http_code}' --max-time 30 "$base/api/health" || true)"
  if [[ "$http_code" != "200" ]]; then
    fail "$label health HTTP $http_code"
    return
  fi

  response="$(cat /tmp/yc-phase0-health.json)"
  echo "$response" | jq -c '{ok, authDatabase, features, database}' 2>/dev/null || echo "$response"

  local ok auth db_ok sync ai_scan pollen
  ok="$(echo "$response" | jq -r '.ok // false')"
  auth="$(echo "$response" | jq -r '.authDatabase // false')"
  db_ok="$(echo "$response" | jq -r '.database.ok // false')"
  sync="$(echo "$response" | jq -r '.features.sync // false')"
  ai_scan="$(echo "$response" | jq -r '.features.aiScan // false')"
  pollen="$(echo "$response" | jq -r '.features.pollenHeatmap // false')"

  [[ "$ok" == "true" ]] && pass "$label ok=true" || fail "$label ok=$ok"
  [[ "$auth" == "true" ]] && pass "$label authDatabase=true" || fail "$label authDatabase=$auth"
  [[ "$db_ok" == "true" ]] && pass "$label database.ok=true" || fail "$label database.ok=$db_ok"
  [[ "$sync" == "true" ]] && pass "$label features.sync=true" || fail "$label features.sync=$sync"
  [[ "$ai_scan" == "true" ]] && pass "$label features.aiScan=true" || fail "$label features.aiScan=$ai_scan"

  if [[ "$EAS_POLLEN_FLAG" == "google" ]]; then
    if [[ "$pollen" == "true" ]]; then
      pass "$label features.pollenHeatmap=true (required by EAS staging=google)"
    elif [[ "${ALLOW_MISSING_POLLEN_HEATMAP:-}" == "1" ]]; then
      warn "$label features.pollenHeatmap=$pollen (allowed by ALLOW_MISSING_POLLEN_HEATMAP=1)"
    else
      fail "$label features.pollenHeatmap=$pollen (set Lockbox POLLEN_HEATMAP_ENABLED + GOOGLE_POLLEN_API_KEY, or ALLOW_MISSING_POLLEN_HEATMAP=1)"
    fi
  else
    pass "$label pollenHeatmap not required (EAS flag=$EAS_POLLEN_FLAG)"
  fi
  echo ""
}

# --- P0.1 / P0.3 / P0.4 primary ---
check_health "P0.1+P0.3+P0.4 primary" "$STAGING_API_URL"

# --- P0.2 RU mirror ---
if [[ "${SKIP_RU_MIRROR:-}" == "1" ]]; then
  warn "P0.2 RU mirror skipped (SKIP_RU_MIRROR=1)"
  echo ""
else
  check_health "P0.2 RU mirror" "$STAGING_API_URL_RU"
fi

# --- P0.7 optional smokes ---
if [[ "${STAGING_RUN_SMOKES:-}" == "1" ]]; then
  echo "--- P0.7 staging-preflight ---"
  export STAGING_API_URL
  if [[ ! -x "$ROOT/scripts/staging-preflight.sh" ]]; then
    chmod +x "$ROOT/scripts/staging-preflight.sh"
  fi
  if "$ROOT/scripts/staging-preflight.sh"; then
    pass "staging-preflight"
  else
    fail "staging-preflight"
  fi
  echo ""
else
  echo "--- P0.7 staging-preflight (skipped) ---"
  echo "  info  set STAGING_RUN_SMOKES=1 to run auth/sync/scan smokes"
  echo ""
fi

echo "=== Summary ==="
echo "Failed: $FAILED  Warnings: $WARNED"
if [[ "$FAILED" -gt 0 ]]; then
  echo "Phase 0 gate FAILED. See docs/migrate-off-replit-to-yc.md" >&2
  exit 1
fi

echo "Phase 0 gate PASSED."
if [[ "$WARNED" -gt 0 ]]; then
  echo "(warnings are non-blocking; clear them in later phases)"
fi
