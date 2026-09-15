#!/usr/bin/env bash
# Create or update the GlitchTip Lockbox payload (NOT aclearo-staging-api-env).
#
# Required:
#   YC_GLITCHTIP_LOCKBOX_SECRET_ID  terraform output -raw glitchtip_lockbox_secret_id
#
# Optional:
#   SECRET_KEY / POSTGRES_PASSWORD  (hex; generated if unset)
#   ENABLE_USER_REGISTRATION        default true
#   EMAIL_URL                       default consolemail://
#
# Usage:
#   YC_GLITCHTIP_LOCKBOX_SECRET_ID=e6q... ./scripts/yc-glitchtip-lockbox-init.sh
#   ENABLE_USER_REGISTRATION=false YC_GLITCHTIP_LOCKBOX_SECRET_ID=e6q... ./scripts/yc-glitchtip-lockbox-init.sh
set -euo pipefail

LOCKBOX_ID="${YC_GLITCHTIP_LOCKBOX_SECRET_ID:-}"

if [[ -z "$LOCKBOX_ID" ]]; then
  echo "Set YC_GLITCHTIP_LOCKBOX_SECRET_ID (terraform output -raw glitchtip_lockbox_secret_id)." >&2
  echo "Do not use YC_LOCKBOX_SECRET_ID — that is the API secret." >&2
  exit 2
fi

API_DEFAULT_ID="e6qs399v1b3unstfh5rj"
if [[ "$LOCKBOX_ID" == "$API_DEFAULT_ID" ]]; then
  echo "Refusing to write GlitchTip keys into the API Lockbox ($API_DEFAULT_ID)." >&2
  exit 2
fi

if ! command -v yc >/dev/null 2>&1; then
  echo "yc CLI not found. Install: https://cloud.yandex.ru/docs/cli/quickstart" >&2
  exit 2
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is required to generate hex secrets." >&2
  exit 2
fi

SECRET_KEY="${SECRET_KEY:-$(openssl rand -hex 32)}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -hex 32)}"
ENABLE_USER_REGISTRATION="${ENABLE_USER_REGISTRATION:-true}"
EMAIL_URL="${EMAIL_URL:-consolemail://}"
DEFAULT_FROM_EMAIL="${DEFAULT_FROM_EMAIL:-support@aclearo.com}"

entries_json() {
  python3 -c '
import json, os
keys = [
    "SECRET_KEY",
    "POSTGRES_PASSWORD",
    "ENABLE_USER_REGISTRATION",
    "EMAIL_URL",
    "DEFAULT_FROM_EMAIL",
]
print(json.dumps([{"key": k, "text_value": os.environ[k]} for k in keys]))
'
}

merge_or_create() {
  local updates_json="$1"
  local current=""
  if current="$(yc lockbox payload get --id "$LOCKBOX_ID" --format json 2>/dev/null)"; then
    python3 - "$current" "$updates_json" <<'PY'
import json, sys
current = json.loads(sys.argv[1])
updates = {u["key"]: u["text_value"] for u in json.loads(sys.argv[2])}
merged = {}
for entry in current.get("entries") or []:
    merged[entry["key"]] = entry.get("text_value") or entry.get("binary_value") or ""
merged.update(updates)
print(json.dumps([{"key": k, "text_value": v} for k, v in merged.items()]))
PY
  else
    printf '%s' "$updates_json"
  fi
}

export SECRET_KEY POSTGRES_PASSWORD ENABLE_USER_REGISTRATION EMAIL_URL DEFAULT_FROM_EMAIL
UPDATES_JSON="$(entries_json)"
MERGED="$(merge_or_create "$UPDATES_JSON")"

echo "Adding Lockbox version on GlitchTip secret $LOCKBOX_ID (SECRET_KEY, POSTGRES_PASSWORD, ENABLE_USER_REGISTRATION, EMAIL_URL, DEFAULT_FROM_EMAIL)"
yc lockbox secret add-version --id "$LOCKBOX_ID" --payload "$MERGED" >/dev/null
echo "Lockbox version added. Re-run with ENABLE_USER_REGISTRATION=false after the first admin exists."
echo "Then on the VM: sudo systemctl restart glitchtip-bootstrap.service"
