#!/usr/bin/env bash
# Phase 5 gate: final acceptance — YC stage green, Replit host paused/gone, no stage replit.app.
# See docs/migrate-off-replit-to-yc.md §Phase 5
#
# Env:
#   REQUIRE_REPLIT_PAUSED=1  fail if aller-guide.replit.app still healthy (default: warn)
#   STAGING_RUN_SMOKES=1     also run staging-preflight.sh
#   SKIP_PRIOR_GATES=1       skip invoking phase 0–4 gates
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STAGING_API_URL="${STAGING_API_URL:-https://api.staging.aclearo.com}"
STAGING_API_URL="${STAGING_API_URL%/}"
REPLIT_URL="${REPLIT_HEALTH_URL:-https://aller-guide.replit.app}"
REPLIT_URL="${REPLIT_URL%/}"

FAILED=0
WARNED=0

pass() { echo "  PASS  $*"; }
fail() { echo "  FAIL  $*"; FAILED=$((FAILED + 1)); }
warn() { echo "  WARN  $*"; WARNED=$((WARNED + 1)); }

echo "=== YC stage Phase 5 gate (final acceptance) ==="
echo "YC: $STAGING_API_URL"
echo "Replit probe: $REPLIT_URL"
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

# --- P5.3 no replit.app in active stage paths ---
echo "--- P5.3 no replit.app in stage client/config ---"
HITS="$(
  {
    grep -RIn --exclude-dir=node_modules -E 'aller-guide\.replit\.app' \
      apps/mobile/eas.json apps/mobile/.env.staging.example \
      scripts/staging-*.sh .github/workflows/*staging* \
      .github/workflows/deploy-staging*.yml .github/workflows/eas-staging*.yml \
      2>/dev/null || true
  } | sort -u || true
)"
if [[ -z "${HITS//[[:space:]]/}" ]]; then
  pass "no aller-guide.replit.app in stage configs/workflows"
else
  fail "replit.app still referenced:"
  echo "$HITS"
fi

if node -e 'const e=require("./apps/mobile/eas.json"); process.exit(e.build?.replit ? 1 : 0)'; then
  pass "eas.json has no replit profile"
else
  fail "eas.json still has replit profile"
fi

if [[ -e .replit || -e scripts/replit-deploy-build.sh ]]; then
  fail "Replit deploy artifacts still in repo"
else
  pass "Replit deploy artifacts absent"
fi

echo ""

# --- P5.4 Replit host paused ---
echo "--- P5.4 Replit host paused ---"
CODE="$(curl -sS -o /tmp/p5-replit-health.json -w '%{http_code}' --max-time 20 \
  "$REPLIT_URL/api/health" || echo "000")"
if [[ "$CODE" == "200" ]]; then
  BODY="$(head -c 200 /tmp/p5-replit-health.json 2>/dev/null || true)"
  MSG="Replit still healthy HTTP 200 ($REPLIT_URL) — pause/unpublish in Replit Deployments UI"
  if [[ "${REQUIRE_REPLIT_PAUSED:-}" == "1" ]]; then
    fail "$MSG"
  else
    warn "$MSG (set REQUIRE_REPLIT_PAUSED=1 to fail)"
  fi
  echo "  info  body: $BODY"
elif [[ "$CODE" == "000" ]]; then
  pass "Replit unreachable (treat as paused/down)"
else
  pass "Replit not serving healthy API (HTTP $CODE) — acceptable for pause"
fi

echo ""
echo "=== Summary ==="
echo "Failed: $FAILED  Warnings: $WARNED"
echo "Pause runbook: docs/migrate-off-replit-to-yc.md §Phase 5"
if [[ "$FAILED" -gt 0 ]]; then
  echo "Phase 5 gate FAILED." >&2
  exit 1
fi
echo "Phase 5 gate PASSED."
if [[ "$WARNED" -gt 0 ]]; then
  echo "(Replit host may still be live — complete pause ops, then REQUIRE_REPLIT_PAUSED=1)"
fi
