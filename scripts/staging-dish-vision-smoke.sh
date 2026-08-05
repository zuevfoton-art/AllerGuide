#!/usr/bin/env bash
# Staging dish-vision (Yandex VL) smoke.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export STAGING_API_URL="${STAGING_API_URL:-https://api.staging.aclearo.com}"
if [[ -n "${DISH_VISION_SMOKE_IMAGE_PATH:-}" ]]; then
  export DISH_VISION_SMOKE_IMAGE_PATH
elif [[ -f "$ROOT/scripts/fixtures/dish-vision-smoke.jpg" ]]; then
  export DISH_VISION_SMOKE_IMAGE_PATH="$ROOT/scripts/fixtures/dish-vision-smoke.jpg"
fi
pnpm exec tsx "$ROOT/scripts/staging-dish-vision-smoke.ts"
