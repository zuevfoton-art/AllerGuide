#!/usr/bin/env bash
# Phase 1: enable Google pollen heatmap on YC staging via Lockbox + container redeploy.
#
# Prerequisites:
#   - yc CLI authenticated (service account with lockbox + serverless.containers.editor)
#   - GOOGLE_POLLEN_API_KEY = GCP Pollen API server key (never EXPO_PUBLIC_*)
#   - YC_CONTAINER_ID, YC_REGISTRY_ID (or IMAGE=...)
#
# Usage:
#   export GOOGLE_POLLEN_API_KEY=AIza…
#   export YC_CONTAINER_ID=…
#   export YC_REGISTRY_ID=…
#   ./scripts/yc-stage-phase1-enable-pollen.sh
#
# Optional:
#   BUILD_PUSH=1   docker build + push :staging (and :$IMAGE_TAG) before deploy
#   IMAGE_TAG=sha  tag to deploy (default staging)
#   SKIP_DEPLOY=1  only upsert Lockbox
#   SKIP_SMOKE=1   skip pollen smoke after deploy
#   STAGING_API_URL=https://api.staging.aclearo.com
#
# See docs/migrate-off-replit-to-yc.md Phase 1.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LOCKBOX_ID="${YC_LOCKBOX_SECRET_ID:-e6qs399v1b3unstfh5rj}"
export YC_LOCKBOX_SECRET_ID="$LOCKBOX_ID"
STAGING_API_URL="${STAGING_API_URL:-https://api.staging.aclearo.com}"
STAGING_API_URL="${STAGING_API_URL%/}"
IMAGE_NAME="${IMAGE_NAME:-aclearo-api}"
IMAGE_TAG="${IMAGE_TAG:-staging}"

: "${GOOGLE_POLLEN_API_KEY:?Set GOOGLE_POLLEN_API_KEY (Pollen API server key)}"

if ! command -v yc >/dev/null 2>&1; then
  echo "yc CLI not found" >&2
  exit 2
fi

chmod +x \
  "$ROOT/scripts/yc-lockbox-upsert.sh" \
  "$ROOT/scripts/yc-lockbox-deploy-secrets.sh" \
  "$ROOT/scripts/staging-pollen-smoke.sh" 2>/dev/null || true

echo "=== Phase 1: Lockbox pollen keys ($LOCKBOX_ID) ==="
GOOGLE_POLLEN_API_KEY="$GOOGLE_POLLEN_API_KEY" \
  "$ROOT/scripts/yc-lockbox-upsert.sh" --pollen

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
sleep 8

if [[ "${SKIP_SMOKE:-}" == "1" ]]; then
  echo "SKIP_SMOKE=1 — done"
  exit 0
fi

echo "=== Pollen smoke ==="
STAGING_API_URL="$STAGING_API_URL" "$ROOT/scripts/staging-pollen-smoke.sh"

echo "Phase 1 complete. Re-run: pnpm yc-stage-phase0"
