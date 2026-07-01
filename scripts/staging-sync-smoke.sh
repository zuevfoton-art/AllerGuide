#!/usr/bin/env bash
# API-level encrypted sync smoke for staging (P1.4b).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export STAGING_API_URL="${STAGING_API_URL:-${1:-https://api.staging.allerguide.app}}"

echo "Running staging sync smoke against $STAGING_API_URL"
pnpm --filter api exec tsx "$ROOT/scripts/staging-sync-smoke.ts"
