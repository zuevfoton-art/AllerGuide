#!/usr/bin/env bash
# API-level AI scan smoke for staging (P1.5b). Burns one LLM call on cache miss.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export STAGING_API_URL="${STAGING_API_URL:-${1:-https://api.staging.aclearo.com}}"

echo "Running staging scan smoke against $STAGING_API_URL"
pnpm --filter api exec tsx "$ROOT/scripts/staging-scan-smoke.ts"
