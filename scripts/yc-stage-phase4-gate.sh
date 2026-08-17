#!/usr/bin/env bash
# Phase 4 gate: staging secrets/data hygiene (Lockbox + GH + EAS policy in docs/repo).
# Does not print secret values. Optional live Lockbox name-audit when `yc` is configured.
# See docs/yc-stage-gates.md §Phase 4 · docs/staging-secrets-inventory.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FAILED=0
WARNED=0
LOCKBOX_ID="${YC_LOCKBOX_SECRET_ID:-e6qs399v1b3unstfh5rj}"

pass() { echo "  PASS  $*"; }
fail() { echo "  FAIL  $*"; FAILED=$((FAILED + 1)); }
warn() { echo "  WARN  $*"; WARNED=$((WARNED + 1)); }

echo "=== YC stage Phase 4 gate (secrets / data hygiene) ==="
echo ""

# --- P4.1 git hygiene: no private keys / live Google API keys in tracked files ---
echo "--- P4.1 git secret hygiene ---"
LEAKS="$(
  git grep -nE -- '-----BEGIN ([A-Z0-9]+ )?PRIVATE KEY-----|AIzaSy[0-9A-Za-z_-]{30,}' \
    -- ':!docs/archive/**' \
    2>/dev/null || true
)"
# Filter false positives: empty placeholders and ellipsis examples
LEAKS_FILTERED="$(
  printf '%s\n' "$LEAKS" | grep -vE 'AIza…|AIza\.\.\.|YOUR_|<.*>|placeholder' || true
)"
if [[ -z "${LEAKS_FILTERED//[[:space:]]/}" ]]; then
  pass "no private keys / live AIza keys in tracked sources"
else
  fail "possible secrets in git:"
  echo "$LEAKS_FILTERED"
fi

TRACKED_ENV="$(git ls-files | grep -E '(^|/)\.env$' || true)"
if [[ -z "$TRACKED_ENV" ]]; then
  pass "no committed .env files"
else
  fail "committed .env files: $TRACKED_ENV"
fi

if grep -q '^\.env' .gitignore && grep -q '^\.env\.\*' .gitignore; then
  pass ".gitignore covers .env / .env.*"
else
  fail ".gitignore must ignore .env and .env.*"
fi

echo ""

# --- P4.2 Lockbox key list file ---
echo "--- P4.2 lockbox-staging.keys ---"
KEYS_FILE="apps/api/lockbox-staging.keys"
REQUIRED_KEYS=(
  DATABASE_URL
  JWT_SECRET
  SYNC_ENABLED
  AI_SCAN_ENABLED
  POLLEN_HEATMAP_ENABLED
  GOOGLE_POLLEN_API_KEY
  MAP_PLACES_ENABLED
  GOOGLE_PLACES_API_KEY
  AIR_QUALITY_ENABLED
  GOOGLE_AIR_QUALITY_API_KEY
)
if [[ ! -f "$KEYS_FILE" ]]; then
  fail "missing $KEYS_FILE"
else
  pass "found $KEYS_FILE"
  for k in "${REQUIRED_KEYS[@]}"; do
    if grep -qx "$k" "$KEYS_FILE"; then
      pass "lists $k"
    else
      fail "$KEYS_FILE missing required key name $k"
    fi
  done
fi

echo ""

# --- P4.3 never client-bundle server pollen / DB secrets ---
echo "--- P4.3 no server secrets in EXPO_PUBLIC / eas ---"
BAD_EXPO="$(
  git grep -nE 'EXPO_PUBLIC_(GOOGLE_POLLEN|POLLEN_API|JWT_SECRET|DATABASE_URL|YC_AI_API_KEY)' \
    -- '*.ts' '*.tsx' '*.js' '*.json' '*.example' '*.md' \
    2>/dev/null || true
)"
# Allow docs that say "never EXPO_PUBLIC pollen"
BAD_EXPO_FILTERED="$(
  printf '%s\n' "$BAD_EXPO" | grep -vE 'never|не |Forbidden|must not|не клад' || true
)"
if [[ -z "${BAD_EXPO_FILTERED//[[:space:]]/}" ]]; then
  pass "no EXPO_PUBLIC_* for pollen/JWT/DB/YC AI"
else
  fail "server secret mapped to EXPO_PUBLIC:"
  echo "$BAD_EXPO_FILTERED"
fi

if grep -nE 'GOOGLE_(POLLEN|PLACES|AIR_QUALITY)_API_KEY' apps/mobile/eas.json >/dev/null 2>&1; then
  fail "eas.json must not contain server Google API keys"
else
  pass "eas.json has no server Google API keys"
fi

echo ""

# --- P4.4 docs inventory + rotation checklist ---
echo "--- P4.4 docs ---"
for f in docs/staging-secrets-inventory.md docs/staging-secrets-rotation-checklist.md; do
  if [[ -f "$f" ]]; then
    pass "present $f"
  else
    fail "missing $f"
  fi
done

if grep -q 'YC_SA_JSON' docs/staging-secrets-inventory.md \
  && grep -q 'YC_LOCKBOX_SECRET_ID' docs/staging-secrets-inventory.md; then
  pass "inventory lists GitHub YC_* secrets"
else
  fail "inventory incomplete for GitHub secrets"
fi

if grep -q 'YC Managed PostgreSQL' docs/staging-secrets-inventory.md \
  || grep -q 'Managed PostgreSQL' docs/staging-secrets-inventory.md; then
  pass "inventory states YC PG as data SoT"
else
  fail "inventory must state YC Managed PG policy"
fi

echo ""

# --- P4.5 optional live Lockbox name audit ---
echo "--- P4.5 Lockbox live audit (optional) ---"
if command -v yc >/dev/null 2>&1 && yc config list >/dev/null 2>&1; then
  if KEYS_JSON="$(yc lockbox secret get --id "$LOCKBOX_ID" --format json 2>/dev/null)"; then
    for k in POLLEN_HEATMAP_ENABLED GOOGLE_POLLEN_API_KEY DATABASE_URL JWT_SECRET; do
      if echo "$KEYS_JSON" | KEY="$k" python3 -c '
import json, os, sys
d = json.load(sys.stdin)
v = d.get("currentVersion") or d.get("current_version") or {}
keys = v.get("payloadEntryKeys") or v.get("payload_entry_keys") or []
sys.exit(0 if os.environ["KEY"] in keys else 1)
'; then
        pass "Lockbox has $k"
      else
        fail "Lockbox missing $k (id=$LOCKBOX_ID)"
      fi
    done
  else
    warn "yc present but cannot read Lockbox $LOCKBOX_ID (configure SA key)"
  fi
else
  warn "yc not configured — skip live Lockbox audit (static checks only)"
fi

echo ""

# --- P4.6 data policy reminder ---
echo "--- P4.6 data policy ---"
if grep -q 'Never store stage secrets outside YC Lockbox' docs/staging-secrets-inventory.md \
  && grep -q 'YC Managed PostgreSQL' docs/staging-secrets-inventory.md; then
  pass "inventory requires YC Lockbox + YC Managed PostgreSQL"
else
  fail "inventory must require YC Lockbox and YC Managed PostgreSQL as SoT"
fi

# Live API still healthy (quick)
if curl -sf --max-time 20 https://api.staging.aclearo.com/api/health >/tmp/p4-health.json; then
  ok="$(python3 -c 'import json; print(json.load(open("/tmp/p4-health.json")).get("ok"))')"
  [[ "$ok" == "True" || "$ok" == "true" ]] && pass "staging API health ok" || fail "staging API ok=$ok"
else
  warn "staging API health unreachable from this host"
fi

echo ""
echo "=== Summary ==="
echo "Failed: $FAILED  Warnings: $WARNED"
echo "Ops rotation checklist: docs/staging-secrets-rotation-checklist.md"
if [[ "$FAILED" -gt 0 ]]; then
  echo "Phase 4 gate FAILED." >&2
  exit 1
fi
echo "Phase 4 gate PASSED."
if [[ "$WARNED" -gt 0 ]]; then
  echo "(complete rotation checklist manually — Phase 4 ops)"
fi
