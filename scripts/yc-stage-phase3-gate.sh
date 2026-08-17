#!/usr/bin/env bash
# Phase 3 gate: no foreign-host deploy artifacts. See docs/yc-stage-gates.md §Phase 3
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

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

echo "=== YC stage Phase 3 gate (repo hygiene) ==="
echo ""

echo "--- P3.1 EAS / npm ---"
if node -e 'const e=require("./apps/mobile/eas.json"); process.exit(e.build?.replit ? 1 : 0)'; then
  pass "eas.json has only YC staging/production profiles"
else
  fail "eas.json still defines a non-YC build.replit profile"
fi

node -e '
  const s = require("./apps/mobile/package.json").scripts || {};
  let bad = 0;
  for (const n of ["build:replit:android", "build:replit:ios"]) {
    if (s[n]) { console.log("  FAIL  " + n + " still present"); bad++; }
    else console.log("  PASS  " + n + " removed");
  }
  for (const n of ["build:staging:android", "build:staging:ios"]) {
    if (!s[n]) { console.log("  FAIL  missing " + n); bad++; }
    else console.log("  PASS  " + n + " present");
  }
  process.exit(bad ? 1 : 0);
' || FAILED=$((FAILED + 1))

echo ""
echo "--- P3.2 deploy artifacts ---"
for path in .replit scripts/replit-deploy-build.sh scripts/replit-db-env.sh apps/mobile/.env.replit.example; do
  if [[ -e "$path" ]]; then
    fail "still present: $path"
  else
    pass "removed $path"
  fi
done

if [[ -d .replit_integration_files || -d apps/api/src/replit_integrations ]]; then
  fail "foreign-host integration directory still present"
else
  pass "foreign-host integration directories removed"
fi

for path in docs/replit-deploy.md docs/archive/replit-deploy.md docs/migrate-off-replit-to-yc.md; do
  if [[ -f "$path" ]]; then
    fail "still present: $path"
  else
    pass "removed $path"
  fi
done

echo ""
echo "--- P3.3 env examples ---"
if grep -nE '^(# )?REPL_ID=' apps/api/.env.staging.example .env.example 2>/dev/null; then
  fail "env examples must not document REPL_ID"
else
  pass "env examples do not document REPL_ID"
fi

echo ""
echo "--- P3.4 product docs / env ---"
DOC_HITS="$(
  grep -RInE --exclude-dir=node_modules -e 'replit' \
    docs AGENTS.md README.md .env.example \
    apps/api/.env.staging.example apps/mobile/.env.staging.example \
    2>/dev/null || true
)"
if [[ -z "${DOC_HITS//[[:space:]]/}" ]]; then
  pass "product docs and env examples do not mention a foreign host"
else
  fail "product docs / env examples still mention a foreign host:"
  echo "$DOC_HITS"
fi

echo ""
echo "--- P3.5 stage clients → YC ---"
if grep -n 'api.staging.aclearo.com' apps/mobile/eas.json apps/mobile/.env.staging.example >/dev/null; then
  pass "mobile stage configs point at api.staging.aclearo.com"
else
  fail "mobile stage configs must use api.staging.aclearo.com"
fi

echo ""
echo "=== Summary ==="
echo "Failed: $FAILED  Warnings: $WARNED"
if [[ "$FAILED" -gt 0 ]]; then
  echo "Phase 3 gate FAILED. See docs/yc-stage-gates.md §Phase 3" >&2
  exit 1
fi
echo "Phase 3 gate PASSED."
