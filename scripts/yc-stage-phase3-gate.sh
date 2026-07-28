#!/usr/bin/env bash
# Phase 3 gate: Replit deploy artifacts removed from the repo.
# OIDC code may remain behind REPL_ID (off on YC). See docs/migrate-off-replit-to-yc.md §Phase 3
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

echo "=== YC stage Phase 3 gate (Replit cleanup) ==="
echo ""

echo "--- P3.1 EAS / npm ---"
if node -e 'const e=require("./apps/mobile/eas.json"); process.exit(e.build?.replit ? 1 : 0)'; then
  pass "eas.json has no profile \"replit\""
else
  fail "eas.json still defines build.replit"
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

if [[ -d .replit_integration_files ]]; then
  fail ".replit_integration_files directory still present"
else
  pass ".replit_integration_files removed"
fi

if [[ -f docs/replit-deploy.md ]]; then
  fail "docs/replit-deploy.md should be archived under docs/archive/"
elif [[ -f docs/archive/replit-deploy.md ]]; then
  pass "docs/replit-deploy.md archived"
else
  fail "missing docs/archive/replit-deploy.md"
fi

echo ""
echo "--- P3.3 OIDC policy ---"
if [[ -d apps/api/src/replit_integrations ]]; then
  pass "replit_integrations kept (opt-in via REPL_ID; unset on YC)"
else
  warn "replit_integrations removed — ensure createApp/tests still green"
fi

if grep -n '^REPL_ID=' apps/api/.env.staging.example >/dev/null 2>&1; then
  fail "apps/api/.env.staging.example must not set REPL_ID"
else
  pass ".env.staging.example does not enable REPL_ID"
fi

echo ""
echo "--- P3.4 no active replit.app stage pointers in eas/mobile env ---"
if grep -RIn --exclude-dir=node_modules -E 'aller-guide\.replit\.app' apps/mobile/eas.json apps/mobile/.env.staging.example 2>/dev/null; then
  fail "mobile stage config still references aller-guide.replit.app"
else
  pass "no aller-guide.replit.app in eas.json / .env.staging.example"
fi

echo ""
echo "=== Summary ==="
echo "Failed: $FAILED  Warnings: $WARNED"
if [[ "$FAILED" -gt 0 ]]; then
  echo "Phase 3 gate FAILED. See docs/migrate-off-replit-to-yc.md §Phase 3" >&2
  exit 1
fi
echo "Phase 3 gate PASSED."
