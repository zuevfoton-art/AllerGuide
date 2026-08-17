#!/usr/bin/env bash
# API-level encrypted sync smoke for staging (P1.4b).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export STAGING_API_URL="${STAGING_API_URL:-${1:-https://api.staging.aclearo.com}}"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required (packageManager: pnpm@10.34.4)" >&2
  exit 127
fi

echo "Running staging sync smoke against $STAGING_API_URL"
# Script lives in /scripts; resolve workspace deps from the api package.
cd "$ROOT/apps/api"
export NODE_PATH="$ROOT/apps/api/node_modules${NODE_PATH:+:$NODE_PATH}"
pnpm exec tsx "$ROOT/scripts/staging-sync-smoke.ts"
