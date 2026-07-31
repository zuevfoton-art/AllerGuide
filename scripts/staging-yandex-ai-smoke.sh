#!/usr/bin/env bash
# Staging Yandex AI smoke (scan + intent + search + ocr).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export STAGING_API_URL="${STAGING_API_URL:-https://api.staging.aclearo.com}"
pnpm --filter api exec tsx "$ROOT/scripts/staging-yandex-ai-smoke.ts"
