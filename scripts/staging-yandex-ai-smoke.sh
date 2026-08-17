#!/usr/bin/env bash
# Staging Yandex AI smoke (scan + intent + search + ocr).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export STAGING_API_URL="${STAGING_API_URL:-https://api.staging.aclearo.com}"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required (packageManager: pnpm@10.34.4)" >&2
  exit 127
fi

cd "$ROOT/apps/api"
export NODE_PATH="$ROOT/apps/api/node_modules${NODE_PATH:+:$NODE_PATH}"
pnpm exec tsx "$ROOT/scripts/staging-yandex-ai-smoke.ts"
