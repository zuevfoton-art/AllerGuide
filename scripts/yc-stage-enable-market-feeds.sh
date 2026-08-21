#!/usr/bin/env bash
# Enable Yandex Distribution YML + OTC pharmacy feeds on YC staging (Lockbox + remount).
#
# Prerequisites:
#   - yc CLI authenticated (lockbox.payloadEditor + serverless.containers.editor)
#   - HTTPS Yandex Distribution product-feed URL
#   - HTTPS Admitad / Zdravcity OTC pharmacy feed URL (legal + partner approval)
#   - Staging API image that reports GET /api/market/health feed flags
#
# Usage:
#   export YANDEX_MARKET_FEED_URL=https://…
#   export MARKET_PHARMACY_FEED_URL=https://…
#   # optional affiliate resolve:
#   export YANDEX_MARKET_CLID=…
#   export YANDEX_MARKET_OAUTH_TOKEN=…
#   export YANDEX_MARKET_ERID=…
#   ./scripts/yc-stage-enable-market-feeds.sh
#
# Optional:
#   SKIP_DEPLOY=1   only upsert Lockbox
#   SKIP_SMOKE=1    skip /api/market/health after deploy
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

: "${YANDEX_MARKET_FEED_URL:?Set YANDEX_MARKET_FEED_URL to the official Distribution YML HTTPS URL}"
: "${MARKET_PHARMACY_FEED_URL:?Set MARKET_PHARMACY_FEED_URL to the OTC pharmacy feed HTTPS URL}"

python3 - "$YANDEX_MARKET_FEED_URL" "$MARKET_PHARMACY_FEED_URL" <<'PY'
import sys
from urllib.parse import urlparse

for raw in sys.argv[1:]:
    parsed = urlparse(raw.strip())
    if parsed.scheme != "https" or not parsed.netloc:
        raise SystemExit(f"Feed URL must be https://host/… (got scheme={parsed.scheme!r})")
PY

if ! command -v yc >/dev/null 2>&1; then
  echo "yc CLI not found" >&2
  exit 2
fi

chmod +x \
  "$ROOT/scripts/yc-lockbox-upsert.sh" \
  "$ROOT/scripts/yc-lockbox-deploy-secrets.sh" 2>/dev/null || true

echo "=== Lockbox market feed keys ($LOCKBOX_ID) ==="
YANDEX_MARKET_FEED_URL="$YANDEX_MARKET_FEED_URL" \
MARKET_PHARMACY_FEED_URL="$MARKET_PHARMACY_FEED_URL" \
MARKET_PHARMACY_FEED_ENABLED="${MARKET_PHARMACY_FEED_ENABLED:-true}" \
YANDEX_MARKET_CURATOR_SEARCH="${YANDEX_MARKET_CURATOR_SEARCH:-false}" \
YANDEX_MARKET_CLID="${YANDEX_MARKET_CLID:-}" \
YANDEX_MARKET_OAUTH_TOKEN="${YANDEX_MARKET_OAUTH_TOKEN:-}" \
YANDEX_MARKET_ERID="${YANDEX_MARKET_ERID:-}" \
  "$ROOT/scripts/yc-lockbox-upsert.sh" --market-feeds

if [[ "${SKIP_DEPLOY:-}" == "1" ]]; then
  echo "SKIP_DEPLOY=1 — Lockbox updated only. Redeploy container to pick up secrets."
  exit 0
fi

echo "=== Deploy Serverless revision with Lockbox mounts ==="
REQUIRE_MARKET_FEEDS=1 \
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

echo "=== Market health smoke ==="
HEALTH="$(curl -fsS "${STAGING_API_URL}/api/market/health")"
echo "$HEALTH"
echo "$HEALTH" | python3 -c '
import json,sys
body=json.load(sys.stdin)
assert body.get("ok") is True, body
assert body.get("yandexFeedConfigured") is True, body
assert body.get("pharmacyFeedConfigured") is True, body
print("market-health ok (yandexFeedConfigured + pharmacyFeedConfigured)")
'

echo "Market feeds mounted on staging API."
echo "Import drafts from the VPC runner: pnpm --filter api db:import-market"
echo "Published catalog stays seed until a curator sets allergen ids and publishes."
