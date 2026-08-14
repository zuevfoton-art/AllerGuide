#!/usr/bin/env bash
# Enable Google Places API (New) + Air Quality on YC staging (Lockbox + remount).
#
# Prerequisites:
#   - yc CLI authenticated (lockbox + serverless.containers.editor)
#   - Maps Platform server key with Places API (New) + Air Quality API allowed
#   - Staging API image that includes /api/places/nearby and /api/air-quality/*
#   - Mobile EAS staging: EXPO_PUBLIC_MAP_PLACES=true and EXPO_PUBLIC_AIR_QUALITY=google
#
# Usage:
#   export GOOGLE_PLACES_API_KEY=…          # or MAPS_PLATFORM_API_KEY_FILE=/path
#   export GOOGLE_AIR_QUALITY_API_KEY=…     # defaults to the Places key if unset
#   ./scripts/yc-stage-enable-places-air-quality.sh
#
# Optional:
#   MAPS_PLATFORM_API_KEY_FILE  read one Maps Platform key for both APIs (no echo)
#   GOOGLE_MAPS_SERVER_API_KEY  same: fill both dedicated keys when they are unset
#   SKIP_DEPLOY=1               only upsert Lockbox
#   SKIP_SMOKE=1                skip staging Places/AQ smoke after deploy
#   BUILD_PUSH=1                docker build + push :staging before remount
#   STAGING_API_URL=https://api.staging.aclearo.com
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOCKBOX_ID="${YC_LOCKBOX_SECRET_ID:-e6qs399v1b3unstfh5rj}"
export YC_LOCKBOX_SECRET_ID="$LOCKBOX_ID"
STAGING_API_URL="${STAGING_API_URL:-https://api.staging.aclearo.com}"
STAGING_API_URL="${STAGING_API_URL%/}"
YC_CONTAINER_ID="${YC_CONTAINER_ID:-bba700s2t35i2khgmiit}"
IMAGE_NAME="${IMAGE_NAME:-aclearo-api}"
IMAGE_TAG="${IMAGE_TAG:-staging}"

read_key_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "MAPS_PLATFORM_API_KEY_FILE not found: $path" >&2
    exit 2
  fi
  # Accept a bare AIza… key or a labeled line like "Maps Platform API Key AIza…".
  python3 - "$path" <<'PY'
import re, sys
text = open(sys.argv[1], encoding="utf-8-sig").read()
match = re.search(r"AIza[0-9A-Za-z_-]{20,}", text)
if not match:
    raise SystemExit("MAPS_PLATFORM_API_KEY_FILE has no AIza… token")
print(match.group(0), end="")
PY
}

SHARED_KEY=""
if [[ -n "${MAPS_PLATFORM_API_KEY_FILE:-}" ]]; then
  SHARED_KEY="$(read_key_file "$MAPS_PLATFORM_API_KEY_FILE")"
fi
if [[ -z "$SHARED_KEY" && -n "${GOOGLE_MAPS_SERVER_API_KEY:-}" ]]; then
  SHARED_KEY="$GOOGLE_MAPS_SERVER_API_KEY"
fi

GOOGLE_PLACES_API_KEY="${GOOGLE_PLACES_API_KEY:-$SHARED_KEY}"
GOOGLE_AIR_QUALITY_API_KEY="${GOOGLE_AIR_QUALITY_API_KEY:-${GOOGLE_PLACES_API_KEY}}"

if [[ -z "$GOOGLE_PLACES_API_KEY" || -z "$GOOGLE_AIR_QUALITY_API_KEY" ]]; then
  echo "Set GOOGLE_PLACES_API_KEY and GOOGLE_AIR_QUALITY_API_KEY, or MAPS_PLATFORM_API_KEY_FILE / GOOGLE_MAPS_SERVER_API_KEY" >&2
  exit 2
fi

if [[ "$GOOGLE_PLACES_API_KEY" != AIza* || "$GOOGLE_AIR_QUALITY_API_KEY" != AIza* ]]; then
  echo "Expected Google API keys starting with AIza (values not printed)" >&2
  exit 2
fi

if ! command -v yc >/dev/null 2>&1; then
  echo "yc CLI not found" >&2
  exit 2
fi

chmod +x \
  "$ROOT/scripts/yc-lockbox-upsert.sh" \
  "$ROOT/scripts/yc-lockbox-deploy-secrets.sh" \
  "$ROOT/scripts/staging-places-air-quality-smoke.sh" 2>/dev/null || true

echo "=== Lockbox Places + Air Quality keys ($LOCKBOX_ID) ==="
GOOGLE_PLACES_API_KEY="$GOOGLE_PLACES_API_KEY" \
  GOOGLE_AIR_QUALITY_API_KEY="$GOOGLE_AIR_QUALITY_API_KEY" \
  "$ROOT/scripts/yc-lockbox-upsert.sh" --places-air-quality

if [[ "${SKIP_DEPLOY:-}" == "1" ]]; then
  echo "SKIP_DEPLOY=1 — Lockbox updated only. Redeploy container to pick up secrets."
  exit 0
fi

: "${YC_CONTAINER_ID:?Set YC_CONTAINER_ID for deploy}"

if [[ "${BUILD_PUSH:-}" == "1" ]]; then
  : "${YC_REGISTRY_ID:?Set YC_REGISTRY_ID for BUILD_PUSH=1}"
  if ! command -v docker >/dev/null 2>&1; then
    echo "docker required for BUILD_PUSH=1" >&2
    exit 2
  fi
  IMAGE_BASE="cr.yandex/${YC_REGISTRY_ID}/${IMAGE_NAME}"
  echo "=== Build & push ${IMAGE_BASE}:${IMAGE_TAG} ==="
  docker build -t "${IMAGE_BASE}:${IMAGE_TAG}" -t "${IMAGE_BASE}:staging" .
  docker push "${IMAGE_BASE}:${IMAGE_TAG}"
  docker push "${IMAGE_BASE}:staging"
  export IMAGE="${IMAGE_BASE}:${IMAGE_TAG}"
fi

echo "=== Deploy Serverless revision with Lockbox mounts ==="
REQUIRE_PLACES_AIR_QUALITY=1 \
  YC_CONTAINER_ID="$YC_CONTAINER_ID" \
  YC_REGISTRY_ID="${YC_REGISTRY_ID:-}" \
  IMAGE="${IMAGE:-}" \
  IMAGE_TAG="$IMAGE_TAG" \
  "$ROOT/scripts/yc-lockbox-deploy-secrets.sh"

echo "=== Wait for revision ==="
sleep 8

if [[ "${SKIP_SMOKE:-}" == "1" ]]; then
  echo "SKIP_SMOKE=1 — done"
  exit 0
fi

echo "=== Places + Air Quality smoke ==="
STAGING_API_URL="$STAGING_API_URL" "$ROOT/scripts/staging-places-air-quality-smoke.sh"

echo "Places API (New) and Air Quality enabled on staging API."
echo "Rebuild EAS staging APK so EXPO_PUBLIC_MAP_PLACES=true and EXPO_PUBLIC_AIR_QUALITY=google are in the client bundle."
echo "Rotate this Maps Platform key if it was uploaded in chat (docs/staging-secrets-rotation-checklist.md)."
