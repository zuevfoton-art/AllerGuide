#!/usr/bin/env bash
# Enable in-app Yandex interactive basemap on YC staging (Lockbox + container remount).
#
# Prerequisites:
#   - yc CLI authenticated (lockbox + serverless.containers.editor)
#   - YANDEX_MAPS_JS_API_KEY from https://developer.tech.yandex.ru/ (JS API)
#   - Staging API image that includes GET /api/maps/yandex-interactive
#   - Mobile EAS staging: EXPO_PUBLIC_YANDEX_MAP_INTERACTIVE=true (eas.json)
#
# Usage:
#   export YANDEX_MAPS_JS_API_KEY=…
#   export YC_CONTAINER_ID=bba700s2t35i2khgmiit   # optional; default below
#   ./scripts/yc-stage-enable-yandex-maps.sh
#
# Optional:
#   SKIP_DEPLOY=1  only upsert Lockbox
#   SKIP_SMOKE=1   skip /api/maps/yandex-status after deploy
#   STAGING_API_URL=https://api.staging.aclearo.com
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOCKBOX_ID="${YC_LOCKBOX_SECRET_ID:-e6qs399v1b3unstfh5rj}"
export YC_LOCKBOX_SECRET_ID="$LOCKBOX_ID"
STAGING_API_URL="${STAGING_API_URL:-https://api.staging.aclearo.com}"
STAGING_API_URL="${STAGING_API_URL%/}"
YC_CONTAINER_ID="${YC_CONTAINER_ID:-bba700s2t35i2khgmiit}"
IMAGE_TAG="${IMAGE_TAG:-staging}"

: "${YANDEX_MAPS_JS_API_KEY:?Set YANDEX_MAPS_JS_API_KEY (Yandex Maps JavaScript API key)}"

if ! command -v yc >/dev/null 2>&1; then
  echo "yc CLI not found" >&2
  exit 2
fi

chmod +x \
  "$ROOT/scripts/yc-lockbox-upsert.sh" \
  "$ROOT/scripts/yc-lockbox-deploy-secrets.sh" 2>/dev/null || true

echo "=== Lockbox Yandex Maps keys ($LOCKBOX_ID) ==="
YANDEX_MAPS_JS_API_KEY="$YANDEX_MAPS_JS_API_KEY" \
  "$ROOT/scripts/yc-lockbox-upsert.sh" --yandex-maps

if [[ "${SKIP_DEPLOY:-}" == "1" ]]; then
  echo "SKIP_DEPLOY=1 — Lockbox updated only. Redeploy container to pick up secrets."
  exit 0
fi

echo "=== Deploy Serverless revision with Lockbox mounts ==="
REQUIRE_YANDEX_MAPS=1 \
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

echo "=== Yandex maps status smoke ==="
STATUS="$(curl -fsS "${STAGING_API_URL}/api/maps/yandex-status")"
echo "$STATUS"
echo "$STATUS" | python3 -c '
import json,sys
body=json.load(sys.stdin)
assert body.get("ok") is True, body
assert body.get("interactive") is True, body
print("yandex-status ok (interactive=true)")
'

HEALTH="$(curl -fsS "${STAGING_API_URL}/api/health")"
echo "$HEALTH" | python3 -c '
import json,sys
f=json.load(sys.stdin).get("features") or {}
print("health.features.yandexMapsInteractive=", f.get("yandexMapsInteractive"))
if f.get("yandexMapsInteractive") is not True:
    raise SystemExit("expected features.yandexMapsInteractive=true")
'

echo "Yandex Maps interactive enabled on staging API."
echo "Rebuild EAS staging APK so EXPO_PUBLIC_YANDEX_MAP_INTERACTIVE=true is in the client bundle."
