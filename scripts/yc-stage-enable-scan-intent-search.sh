#!/usr/bin/env bash
# Enable YC scan intent (B) + Yandex Search ingredients (C) on staging via Lockbox + redeploy.
#
# Prerequisites:
#   - yc CLI authenticated (lockbox + serverless.containers.editor)
#   - AI_SCAN_ENABLED + YC_AI_* already in Lockbox (Phase 0–2)
#   - YC_CONTAINER_ID, YC_REGISTRY_ID (or IMAGE=...)
#
# Usage:
#   export YC_CONTAINER_ID=bba700s2t35i2khgmiit
#   export YC_REGISTRY_ID=crpf0kl3mrg2qnnd374l
#   BUILD_PUSH=1 ./scripts/yc-stage-enable-scan-intent-search.sh
#
# Optional:
#   BUILD_PUSH=1   docker build + push before deploy
#   IMAGE_TAG=sha  tag to deploy (default: staging)
#   SKIP_DEPLOY=1  only upsert Lockbox
#   SKIP_SMOKE=1   skip health feature checks
#   STAGING_API_URL=https://api.staging.aclearo.com
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

echo "=== Lockbox: YC_SCAN_INTENT_LLM + YC_SEARCH_ENABLED ($LOCKBOX_ID) ==="
"$ROOT/scripts/yc-lockbox-upsert.sh" \
  "YC_SCAN_INTENT_LLM=true" \
  "YC_SEARCH_ENABLED=true"

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
HTTP="$(curl -sS -o /tmp/yc-scan-features-health.json -w '%{http_code}' --max-time 30 \
  "$STAGING_API_URL/api/health" || true)"
if [[ "$HTTP" != "200" ]]; then
  echo "ERROR: health HTTP $HTTP" >&2
  cat /tmp/yc-scan-features-health.json >&2 || true
  exit 1
fi

python3 - <<'PY'
import json, sys
with open("/tmp/yc-scan-features-health.json") as f:
    d = json.load(f)
feat = d.get("features") or {}
ok = d.get("ok") is True
intent = feat.get("ycScanIntentLlm") is True
search = feat.get("ycSearch") is True
print(json.dumps({"ok": ok, "ycScanIntentLlm": intent, "ycSearch": search, "features": feat}, ensure_ascii=False, indent=2))
if not (ok and intent and search):
    sys.exit(1)
PY

echo "Scan intent + Search enablement complete."
