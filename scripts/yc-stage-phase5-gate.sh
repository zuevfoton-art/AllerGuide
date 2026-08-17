#!/usr/bin/env bash
# Phase 5 gate: final Yandex Cloud staging acceptance.
# See docs/yc-stage-gates.md §Phase 5
#
# Env:
#   STAGING_RUN_SMOKES=1     also run staging-preflight.sh
#   SKIP_PRIOR_GATES=1       skip invoking phase 0–4 gates
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STAGING_API_URL="${STAGING_API_URL:-https://api.staging.aclearo.com}"
STAGING_API_URL="${STAGING_API_URL%/}"

FAILED=0
WARNED=0

pass() { echo "  PASS  $*"; }
fail() { echo "  FAIL  $*"; FAILED=$((FAILED + 1)); }
warn() { echo "  WARN  $*"; WARNED=$((WARNED + 1)); }

echo "=== YC stage Phase 5 gate (final acceptance) ==="
echo "YC: $STAGING_API_URL"
echo ""

# --- P5.1 prior gates ---
echo "--- P5.1 prior phase gates ---"
if [[ "${SKIP_PRIOR_GATES:-}" == "1" ]]; then
  warn "SKIP_PRIOR_GATES=1 — not re-running phase 0–4"
else
  for n in 0 2 3 4; do
    script="$ROOT/scripts/yc-stage-phase${n}-gate.sh"
    if [[ ! -x "$script" ]]; then
      fail "missing $script"
      continue
    fi
    echo ">>> phase $n"
    if ALLOW_MISSING_POLLEN_HEATMAP=0 "$script"; then
      pass "phase $n gate"
    else
      fail "phase $n gate"
    fi
    echo ""
  done
fi

# --- P5.2 YC live + pollen smoke ---
echo "--- P5.2 YC live acceptance ---"
if curl -sf --max-time 30 "$STAGING_API_URL/api/health" >/tmp/p5-yc-health.json; then
  if python3 - <<'PY'
import json, sys
h=json.load(open("/tmp/p5-yc-health.json"))
ok=h.get("ok") is True
db=(h.get("database") or {}).get("ok") is True
feat=h.get("features") or {}
checks=[
  ("ok", ok),
  ("database.ok", db),
  ("features.sync", feat.get("sync") is True),
  ("features.aiScan", feat.get("aiScan") is True),
  ("features.pollenHeatmap", feat.get("pollenHeatmap") is True),
]
bad=0
for name, good in checks:
  print(("  PASS  " if good else "  FAIL  ") + name)
  if not good: bad=1
sys.exit(bad)
PY
  then
    :
  else
    FAILED=$((FAILED + 1))
  fi
else
  fail "YC health unreachable"
fi

if [[ -x "$ROOT/scripts/staging-pollen-smoke.sh" ]]; then
  if STAGING_API_URL="$STAGING_API_URL" "$ROOT/scripts/staging-pollen-smoke.sh"; then
    pass "staging-pollen-smoke"
  else
    fail "staging-pollen-smoke"
  fi
else
  fail "missing staging-pollen-smoke.sh"
fi

if [[ "${STAGING_RUN_SMOKES:-}" == "1" ]]; then
  if STAGING_API_URL="$STAGING_API_URL" "$ROOT/scripts/staging-preflight.sh"; then
    pass "staging-preflight"
  else
    fail "staging-preflight"
  fi
else
  echo "  info  set STAGING_RUN_SMOKES=1 to run full preflight"
fi

echo ""

# --- P5.3 stage clients point at YC only ---
echo "--- P5.3 stage clients → YC ---"
if node -e 'const e=require("./apps/mobile/eas.json"); process.exit(e.build?.staging?.env?.EXPO_PUBLIC_API_URL === "https://api.staging.aclearo.com" ? 0 : 1)'; then
  pass "eas.json staging → api.staging.aclearo.com"
else
  fail "eas.json staging must use https://api.staging.aclearo.com"
fi

if [[ -e .replit || -e scripts/replit-deploy-build.sh || -f docs/replit-deploy.md || -f docs/archive/replit-deploy.md ]]; then
  fail "foreign-host deploy artifacts still in repo"
else
  pass "no foreign-host deploy artifacts"
fi

echo ""
echo "=== Summary ==="
echo "Failed: $FAILED  Warnings: $WARNED"
echo "Runbook: docs/yc-stage-gates.md §Phase 5"
if [[ "$FAILED" -gt 0 ]]; then
  echo "Phase 5 gate FAILED." >&2
  exit 1
fi
echo "Phase 5 gate PASSED."
