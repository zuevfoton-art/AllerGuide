#!/usr/bin/env bash
# Attach Lockbox entries listed in apps/api/lockbox-staging.keys to a Serverless
# Container revision deploy. Skips missing Lockbox keys with a warning.
#
# Required env:
#   YC_CONTAINER_ID
#   YC_REGISTRY_ID   (unless IMAGE is set)
#   YC_LOCKBOX_SECRET_ID (default staging)
# Optional:
#   IMAGE            full image URL (default: cr.yandex/$YC_REGISTRY_ID/aclearo-api:staging)
#   IMAGE_TAG        used when IMAGE unset (default: staging)
#   YC_RUNTIME_SA_ID Serverless runtime SA (default: aclearo-staging-api)
#   YC_NETWORK_ID    VPC network for private Postgres (default: aclearo-staging)
#   REQUIRE_POLLEN=1 fail if POLLEN_* keys missing from Lockbox
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEYS_FILE="${LOCKBOX_KEYS_FILE:-$ROOT/apps/api/lockbox-staging.keys}"
LOCKBOX_ID="${YC_LOCKBOX_SECRET_ID:-e6qs399v1b3unstfh5rj}"
IMAGE_NAME="${IMAGE_NAME:-aclearo-api}"
IMAGE_TAG="${IMAGE_TAG:-staging}"
RUNTIME_SA_ID="${YC_RUNTIME_SA_ID:-aje6ao4g8osp10tjlnd5}"
NETWORK_ID="${YC_NETWORK_ID:-enp9qi529uf3bvu15078}"

: "${YC_CONTAINER_ID:?Set YC_CONTAINER_ID}"

if [[ -z "${IMAGE:-}" ]]; then
  : "${YC_REGISTRY_ID:?Set YC_REGISTRY_ID or IMAGE}"
  IMAGE="cr.yandex/${YC_REGISTRY_ID}/${IMAGE_NAME}:${IMAGE_TAG}"
fi

if ! command -v yc >/dev/null 2>&1; then
  echo "yc CLI not found" >&2
  exit 2
fi

if [[ ! -f "$KEYS_FILE" ]]; then
  echo "Missing keys file: $KEYS_FILE" >&2
  exit 2
fi

LOCKBOX_META="$(yc lockbox secret get --id "$LOCKBOX_ID" --format json)"
VERSION_ID="$(echo "$LOCKBOX_META" | python3 -c 'import json,sys; d=json.load(sys.stdin); v=d.get("currentVersion") or d.get("current_version") or {}; print(v.get("id") or "")')"
if [[ -z "$VERSION_ID" ]]; then
  echo "ERROR: could not resolve Lockbox current version id for $LOCKBOX_ID" >&2
  exit 1
fi

mapfile -t WANTED < <(grep -E '^[A-Z0-9_]+$' "$KEYS_FILE" || true)
AVAILABLE="$(yc lockbox payload get --id "$LOCKBOX_ID" --format json | python3 -c 'import json,sys; print("\n".join(e["key"] for e in json.load(sys.stdin).get("entries") or []))')"

DEPLOY_ARGS=(
  --container-id "$YC_CONTAINER_ID"
  --image "$IMAGE"
  --service-account-id "$RUNTIME_SA_ID"
  --network-id "$NETWORK_ID"
  --cores 1
  --memory 512MB
  --execution-timeout 30s
  --environment "API_PORT=3001,NODE_ENV=production,DB_CONNECT_TIMEOUT=10"
)

MISSING=()
MOUNTED=0
for key in "${WANTED[@]}"; do
  if printf '%s\n' "$AVAILABLE" | grep -qx "$key"; then
    DEPLOY_ARGS+=(--secret "environment-variable=${key},id=${LOCKBOX_ID},key=${key},version-id=${VERSION_ID}")
    MOUNTED=$((MOUNTED + 1))
  else
    MISSING+=("$key")
    echo "WARN: Lockbox missing key $key — not mounted"
  fi
done

for required in DATABASE_URL JWT_SECRET; do
  if ! printf '%s\n' "$AVAILABLE" | grep -qx "$required"; then
    echo "ERROR: required Lockbox key missing: $required" >&2
    exit 1
  fi
done

if [[ "${REQUIRE_POLLEN:-}" == "1" ]]; then
  for required in POLLEN_HEATMAP_ENABLED GOOGLE_POLLEN_API_KEY; do
    if ! printf '%s\n' "$AVAILABLE" | grep -qx "$required"; then
      echo "ERROR: REQUIRE_POLLEN=1 but Lockbox missing $required" >&2
      exit 1
    fi
  done
  pollen_flag="$(yc lockbox payload get --id "$LOCKBOX_ID" --format json | python3 -c 'import json,sys; e={x["key"]:x.get("text_value","") for x in json.load(sys.stdin).get("entries") or []}; print(e.get("POLLEN_HEATMAP_ENABLED",""))')"
  if [[ "$pollen_flag" != "true" ]]; then
    echo "ERROR: POLLEN_HEATMAP_ENABLED must be true (got: $pollen_flag)" >&2
    exit 1
  fi
fi

echo "Deploying $IMAGE → container $YC_CONTAINER_ID (mounted $MOUNTED Lockbox keys, version $VERSION_ID, sa $RUNTIME_SA_ID, network $NETWORK_ID)"
yc serverless container revision deploy "${DEPLOY_ARGS[@]}"
echo "Deploy requested."
