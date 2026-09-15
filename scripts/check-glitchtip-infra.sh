#!/usr/bin/env bash
# Static checks for GlitchTip staging infra (no terraform apply, no live YC).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE="$ROOT/infra/yandex/staging/glitchtip/docker-compose.yml"
TF="$ROOT/infra/yandex/staging/glitchtip.tf"
INIT="$ROOT/scripts/yc-glitchtip-lockbox-init.sh"

grep -q "127.0.0.1:8000:8000" "$COMPOSE"
if grep -E "['\"]8000:8000['\"]|[[:space:]]- 8000:8000" "$COMPOSE"; then
  echo "compose must not publish 8000 on all interfaces" >&2
  exit 1
fi
grep -q 'aclearo-staging-glitchtip' "$TF"
grep -q 'yandex_lockbox_secret" "glitchtip"' "$TF"
grep -q 'postgresql.tf' "$TF" && { echo "glitchtip.tf must not reference app postgresql.tf"; exit 1; } || true
if grep -n 'yandex_mdb_postgresql' "$TF"; then
  echo "GlitchTip must not use Managed Postgres" >&2
  exit 1
fi

# Refuse writing GlitchTip keys into the API Lockbox id.
if YC_GLITCHTIP_LOCKBOX_SECRET_ID=e6qs399v1b3unstfh5rj "$INIT" 2>/dev/null; then
  echo "lockbox-init must refuse the API secret id" >&2
  exit 1
fi

echo "glitchtip infra checks OK"
