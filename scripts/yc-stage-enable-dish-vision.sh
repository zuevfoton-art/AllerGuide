#!/usr/bin/env bash
# Enable multimodal dish vision (Option D) on staging via Lockbox + redeploy.
#
# Prerequisites:
#   - yc CLI authenticated (lockbox + serverless.containers.editor)
#   - YC_AI_* credentials already in Lockbox (Phase 0–2)
#   - YC_CONTAINER_ID (and YC_REGISTRY_ID or IMAGE=... for deploy)
#
# Usage:
#   export YC_CONTAINER_ID=bba700s2t35i2khgmiit
#   export YC_REGISTRY_ID=crpf0kl3mrg2qnnd374l
#   ./scripts/yc-stage-enable-dish-vision.sh
#
# Optional:
#   BUILD_PUSH=1   docker build + push before deploy
#   IMAGE_TAG=sha  tag to deploy (default: staging)
#   SKIP_DEPLOY=1  only upsert Lockbox
#   SKIP_SMOKE=1   skip health feature checks
#   STAGING_API_URL=https://api.staging.aclearo.com
#   YC_VISION_MODEL=gemma-3-27b-it  also upsert vision model id
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOCKBOX_ID="${YC_LOCKBOX_SECRET_ID:-e6qs399v1b3unstfh5rj}"
export YC_LOCKBOX_SECRET_ID="$LOCKBOX_ID"
STAGING_API_URL="${STAGING_API_URL:-https://api.staging.aclearo.com}"
STAGING_API_URL="${STAGING_API_URL%/}"
IMAGE_NAME="${IMAGE_NAME:-aclearo-api}"
IMAGE_TAG="${IMAGE_TAG:-staging}"

if ! command -v yc >/dev/null 2>&1; then
  echo "yc CLI not found" >&2
  exit 2
fi

chmod +x \
  "$ROOT/scripts/yc-lockbox-upsert.sh" \
  "$ROOT/scripts/yc-lockbox-deploy-secrets.sh" 2>/dev/null || true

UPSERT_ARGS=(
  "AI_SCAN_ENABLED=true"
  "AI_DISH_VISION_ENABLED=true"
)
if [[ -n "${YC_VISION_MODEL:-}" ]]; then
  UPSERT_ARGS+=("YC_VISION_MODEL=${YC_VISION_MODEL}")
fi

echo "=== Lockbox: AI_SCAN_ENABLED + AI_DISH_VISION_ENABLED ($LOCKBOX_ID) ==="
"$ROOT/scripts/yc-lockbox-upsert.sh" "${UPSERT_ARGS[@]}"

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
REQUIRE_POLLEN=1 \
  YC_CONTAINER_ID="$YC_CONTAINER_ID" \
  YC_REGISTRY_ID="${YC_REGISTRY_ID:-}" \
  IMAGE="${IMAGE:-}" \
  IMAGE_TAG="$IMAGE_TAG" \
  "$ROOT/scripts/yc-lockbox-deploy-secrets.sh"

echo "=== Wait for revision ==="
sleep 10

if [[ "${SKIP_SMOKE:-}" == "1" ]]; then
  echo "SKIP_SMOKE=1 — done"
  exit 0
fi

echo "=== Health feature smoke ==="
HTTP="$(curl -sS -o /tmp/yc-dish-vision-health.json -w '%{http_code}' --max-time 30 \
  "$STAGING_API_URL/api/health" || true)"
if [[ "$HTTP" != "200" ]]; then
  echo "ERROR: health HTTP $HTTP" >&2
  cat /tmp/yc-dish-vision-health.json >&2 || true
  exit 1
fi

python3 - <<'PY'
import json, sys
with open("/tmp/yc-dish-vision-health.json") as f:
    d = json.load(f)
feat = d.get("features") or {}
ok = d.get("ok") is True
ai_scan = feat.get("aiScan") is True
dish = feat.get("aiDishVision") is True
print(json.dumps(
    {"ok": ok, "aiScan": ai_scan, "aiDishVision": dish, "features": feat},
    ensure_ascii=False,
    indent=2,
))
if not (ok and ai_scan and dish):
    sys.exit(1)
PY

echo "Dish vision enablement complete."
