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
grep -q 'glitchtip-setup.sh' "$TF"
if grep -E '^[[:space:]]+- caddy$' "$ROOT/infra/yandex/staging/templates/glitchtip-cloud-init.yaml.tftpl"; then
  echo "Ubuntu 22.04 has no apt package named caddy; install the GitHub binary in setup.sh" >&2
  exit 1
fi
grep -q 'caddy_2.10.0_linux_amd64' "$ROOT/infra/yandex/staging/templates/glitchtip-setup.sh"
grep -q 'glitchtip/glitchtip:6.2.6' "$COMPOSE"
if grep -q 'glitchtip/glitchtip:v6' "$COMPOSE"; then
  echo "Hub tags are 6.x.x without a v prefix" >&2
  exit 1
fi
grep -q 'ENABLE_USER_REGISTRATION:-false' "$COMPOSE"
if grep -E 'ENABLE_USER_REGISTRATION:-\s*true' "$COMPOSE" "$ROOT/infra/yandex/staging/templates/glitchtip-bootstrap.sh.tftpl"; then
  echo "Public GlitchTip signup must default off (createsuperuser on the VM)" >&2
  exit 1
fi
grep -q 'yandex_lockbox_secret" "glitchtip"' "$TF"
if grep -E 'yandex_lockbox_secret\.api_env|lockbox_secret_id \(API\)' "$TF"; then
  echo "glitchtip.tf must not reference the API Lockbox resource" >&2
  exit 1
fi
if grep -E 'glitchtip' "$ROOT/infra/yandex/staging/iam.tf"; then
  echo "GlitchTip instance SA must not get folder-wide IAM in iam.tf (payloadViewer is secret-scoped in glitchtip.tf)" >&2
  exit 1
fi
if grep -E 'glitchtip' "$ROOT/infra/yandex/staging/postgresql.tf" "$ROOT/infra/yandex/staging/runner.tf"; then
  echo "GlitchTip must stay off app MDB and the GitHub runner VM" >&2
  exit 1
fi
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

grep -q 'reverse_proxy 127.0.0.1:8000' "$ROOT/infra/yandex/staging/templates/glitchtip-caddyfile.tftpl"
if grep -A6 'port[[:space:]]*=[[:space:]]*22' "$TF" | grep -q '0.0.0.0/0'; then
  echo "GlitchTip SG must not copy the runner SSH 0.0.0.0/0 rule" >&2
  exit 1
fi
if grep -E 'fail "GlitchTip|fail '\''GlitchTip' "$ROOT/scripts/yc-stage-phase0-gate.sh"; then
  echo "yc-stage-phase0 must not hard-fail on GlitchTip" >&2
  exit 1
fi

echo "glitchtip infra checks OK"
