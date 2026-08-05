#!/usr/bin/env bash
# Staging dish-vision (Yandex VL) smoke.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export STAGING_API_URL="${STAGING_API_URL:-https://api.staging.aclearo.com}"
# Prefer the ops-generated plate PNG when present.
if [[ -f /tmp/dish-smoke.png ]]; then
  export DISH_VISION_SMOKE_PNG_PATH=/tmp/dish-smoke.png
fi
pnpm exec tsx "$ROOT/scripts/staging-dish-vision-smoke.ts"
