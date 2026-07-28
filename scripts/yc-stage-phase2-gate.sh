#!/usr/bin/env bash
# Phase 2 gate: stage clients must target Yandex Cloud, not Replit.
# See docs/migrate-off-replit-to-yc.md §Phase 2
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

EXPECTED_API_URL="https://api.staging.aclearo.com"
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

need_cmd node
need_cmd curl
need_cmd jq

echo "=== YC stage Phase 2 gate (clients → YC only) ==="
echo ""

# --- P2.1 EAS staging profile ---
echo "--- P2.1 eas.json profile staging ---"
EAS_URL="$(
  node -e '
    const eas = require("./apps/mobile/eas.json");
    const env = eas?.build?.staging?.env || {};
    if (!env.EXPO_PUBLIC_API_URL) process.exit(3);
    process.stdout.write(String(env.EXPO_PUBLIC_API_URL));
  '
)" || { fail "eas.json staging missing EXPO_PUBLIC_API_URL"; EAS_URL=""; }

if [[ -n "$EAS_URL" ]]; then
  if [[ "$EAS_URL" == "$EXPECTED_API_URL" ]]; then
    pass "staging EXPO_PUBLIC_API_URL=$EAS_URL"
  else
    fail "staging EXPO_PUBLIC_API_URL=$EAS_URL (expected $EXPECTED_API_URL)"
  fi
  [[ "$EAS_URL" == *replit.app* ]] && fail "staging profile still points at Replit"
fi

POLLEN="$(
  node -e 'const e=require("./apps/mobile/eas.json"); process.stdout.write(String(e.build?.staging?.env?.EXPO_PUBLIC_POLLEN_HEATMAP??"off"))'
)"
AUTH="$(
  node -e 'const e=require("./apps/mobile/eas.json"); process.stdout.write(String(e.build?.staging?.env?.EXPO_PUBLIC_BACKEND_AUTH??"false"))'
)"
[[ "$POLLEN" == "google" ]] && pass "staging EXPO_PUBLIC_POLLEN_HEATMAP=google" || fail "staging pollen flag=$POLLEN (expected google)"
[[ "$AUTH" == "true" ]] && pass "staging EXPO_PUBLIC_BACKEND_AUTH=true" || fail "staging BACKEND_AUTH=$AUTH"

echo ""

# --- P2.2 Mobile env template ---
echo "--- P2.2 apps/mobile/.env.staging.example ---"
ENV_FILE="apps/mobile/.env.staging.example"
if [[ -f "$ENV_FILE" ]]; then
  if grep -q "EXPO_PUBLIC_API_URL=${EXPECTED_API_URL}" "$ENV_FILE"; then
    pass ".env.staging.example → $EXPECTED_API_URL"
  else
    fail ".env.staging.example must set EXPO_PUBLIC_API_URL=$EXPECTED_API_URL"
  fi
  if grep -q 'replit\.app' "$ENV_FILE"; then
    fail ".env.staging.example must not reference replit.app"
  else
    pass ".env.staging.example has no replit.app"
  fi
else
  fail "missing $ENV_FILE"
fi

echo ""

# --- P2.3 Stage build scripts (not replit) ---
echo "--- P2.3 package.json stage scripts ---"
node -e '
  const pkg = require("./apps/mobile/package.json");
  const s = pkg.scripts || {};
  const need = ["build:staging", "build:staging:android", "build:staging:ios"];
  let bad = 0;
  for (const n of need) {
    if (!s[n] || !String(s[n]).includes("--profile staging")) {
      console.log("  FAIL  missing or wrong script " + n);
      bad++;
    } else {
      console.log("  PASS  " + n);
    }
  }
  for (const n of ["build:replit:android", "build:replit:ios"]) {
    const body = String(s[n] || "");
    if (!body) {
      console.log("  PASS  " + n + " removed (Phase 3)");
      continue;
    }
    if (/DEPRECATED|process\.exit\(1\)|yc-stage-phase2/i.test(body)) {
      console.log("  WARN  " + n + " deprecated stub still present — remove in Phase 3");
    } else if (body.includes("--profile replit")) {
      console.log("  FAIL  " + n + " still invokes eas profile replit");
      bad++;
    } else {
      console.log("  FAIL  " + n + " unexpected; remove in Phase 3");
      bad++;
    }
  }
  process.exit(bad ? 1 : 0);
' || FAILED=$((FAILED + 1))

echo ""

# --- P2.4 CI / workflows for staging clients ---
echo "--- P2.4 staging client workflows ---"
WF_HITS="$(
  {
    grep -RIn --exclude-dir=node_modules -E 'replit\.app|profile replit|--profile replit' \
      .github/workflows/eas-staging*.yml \
      .github/workflows/staging-apk*.yml \
      2>/dev/null || true
  } | sort -u || true
)"
if [[ -z "${WF_HITS//[[:space:]]/}" ]]; then
  pass "eas-staging / staging-apk workflows have no replit targets"
else
  fail "replit found in staging client workflows:"
  echo "$WF_HITS"
fi

if grep -q 'api.staging.aclearo.com' .github/workflows/staging-apk-gradle.yml 2>/dev/null \
  || grep -q 'EXPO_PUBLIC_API_URL' .github/workflows/eas-staging-android.yml 2>/dev/null; then
  pass "staging workflows reference YC / staging env"
else
  warn "could not confirm YC URL in staging workflows (check manually)"
fi

echo ""

# --- P2.5 Live API reachable for clients ---
echo "--- P2.5 live staging API ---"
HTTP="$(curl -sS -o /tmp/yc-phase2-health.json -w '%{http_code}' --max-time 30 \
  "$EXPECTED_API_URL/api/health" || true)"
if [[ "$HTTP" == "200" ]]; then
  ok="$(jq -r '.ok // false' /tmp/yc-phase2-health.json)"
  pollen="$(jq -r '.features.pollenHeatmap // false' /tmp/yc-phase2-health.json)"
  [[ "$ok" == "true" ]] && pass "GET $EXPECTED_API_URL/api/health ok=true" || fail "health ok=$ok"
  [[ "$pollen" == "true" ]] && pass "features.pollenHeatmap=true" || warn "pollenHeatmap=$pollen (Phase 1 Lockbox)"
else
  fail "health HTTP $HTTP from $EXPECTED_API_URL"
fi

echo ""

# --- P2.6 Docs: stage path must not recommend Replit as primary ---
echo "--- P2.6 docs stage path ---"
if grep -n 'Подключение приложения к backend (Replit)' docs/android-local-build.md >/dev/null 2>&1; then
  fail "android-local-build.md still titles stage backend as Replit"
else
  pass "android-local-build.md stage section not titled Replit"
fi

if grep -n 'aller-guide.replit.app' docs/eas-staging-build.md >/dev/null 2>&1; then
  fail "eas-staging-build.md must not use replit.app"
else
  pass "eas-staging-build.md has no replit.app"
fi

if [[ -f docs/migrate-off-replit-to-yc.md ]] && grep -q 'Phase 2' docs/migrate-off-replit-to-yc.md; then
  pass "migrate-off-replit-to-yc.md documents Phase 2"
else
  fail "missing Phase 2 section in migrate-off-replit-to-yc.md"
fi

# Legacy eas replit profile must be gone after Phase 3
if node -e 'const e=require("./apps/mobile/eas.json"); process.exit(e.build?.replit ? 0 : 1)'; then
  fail "eas.json still has profile \"replit\" (Phase 3 should delete it)"
else
  pass "eas.json has no profile \"replit\""
fi

echo ""
echo "=== Summary ==="
echo "Failed: $FAILED  Warnings: $WARNED"
if [[ "$FAILED" -gt 0 ]]; then
  echo "Phase 2 gate FAILED. See docs/migrate-off-replit-to-yc.md §Phase 2" >&2
  exit 1
fi
echo "Phase 2 gate PASSED."
if [[ "$WARNED" -gt 0 ]]; then
  echo "(warnings are non-blocking; clear in Phase 3+)"
fi
