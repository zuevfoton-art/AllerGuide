#!/usr/bin/env bash
# Create or update the GlitchTip Lockbox payload (NOT aclearo-staging-api-env).
#
# Required:
#   YC_GLITCHTIP_LOCKBOX_SECRET_ID  terraform output -raw glitchtip_lockbox_secret_id
#
# Optional env (only these overwrite an existing payload):
#   SECRET_KEY / POSTGRES_PASSWORD  hex; generated only when the payload has no value
#   ENABLE_USER_REGISTRATION        default false on first create
#   EMAIL_URL                       default consolemail:// on first create
#   DEFAULT_FROM_EMAIL              default support@aclearo.com on first create
#   GLITCHTIP_ADMIN_PASSWORD        generated when missing; used by bootstrap-admin.sh
#   GLITCHTIP_ADMIN_EMAIL           default support@aclearo.com; first createsuperuser
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

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to merge Lockbox payloads." >&2
  exit 2
fi

CURRENT_JSON="{}"
if CURRENT_JSON="$(yc lockbox payload get --id "$LOCKBOX_ID" --format json 2>/dev/null)"; then
  :
else
  CURRENT_JSON="{}"
fi

MERGED="$(
  CURRENT_JSON="$CURRENT_JSON" python3 - <<'PY'
import json, os, subprocess

current = json.loads(os.environ["CURRENT_JSON"] or "{}")
merged = {}
for entry in current.get("entries") or []:
    merged[entry["key"]] = entry.get("text_value") or entry.get("textValue") or ""

def explicit(name):
    if name in os.environ:
        return os.environ[name]
    return None

def hex_secret() -> str:
    return subprocess.check_output(["openssl", "rand", "-hex", "32"], text=True).strip()

secret_key = explicit("SECRET_KEY")
if secret_key is None:
    secret_key = merged.get("SECRET_KEY") or hex_secret()
postgres = explicit("POSTGRES_PASSWORD")
if postgres is None:
    postgres = merged.get("POSTGRES_PASSWORD") or hex_secret()
registration = explicit("ENABLE_USER_REGISTRATION")
if registration is None:
    registration = merged.get("ENABLE_USER_REGISTRATION") or "false"
email_url = explicit("EMAIL_URL")
if email_url is None:
    email_url = merged.get("EMAIL_URL") or "consolemail://"
from_email = explicit("DEFAULT_FROM_EMAIL")
if from_email is None:
    from_email = merged.get("DEFAULT_FROM_EMAIL") or "support@aclearo.com"
admin_password = explicit("GLITCHTIP_ADMIN_PASSWORD")
if admin_password is None:
    admin_password = merged.get("GLITCHTIP_ADMIN_PASSWORD") or hex_secret()
admin_email = explicit("GLITCHTIP_ADMIN_EMAIL")
if admin_email is None:
    admin_email = merged.get("GLITCHTIP_ADMIN_EMAIL") or "support@aclearo.com"

merged["SECRET_KEY"] = secret_key
merged["POSTGRES_PASSWORD"] = postgres
merged["ENABLE_USER_REGISTRATION"] = registration
merged["EMAIL_URL"] = email_url
merged["DEFAULT_FROM_EMAIL"] = from_email
merged["GLITCHTIP_ADMIN_PASSWORD"] = admin_password
merged["GLITCHTIP_ADMIN_EMAIL"] = admin_email

print(json.dumps([{"key": k, "text_value": v} for k, v in merged.items()]))
print("registration=" + registration, file=__import__("sys").stderr)
PY
)"

echo "Adding Lockbox version on GlitchTip secret $LOCKBOX_ID (existing SECRET_KEY/POSTGRES_PASSWORD kept unless overridden)"
yc lockbox secret add-version --id "$LOCKBOX_ID" --payload "$MERGED" >/dev/null
echo "Lockbox version added. ENABLE_USER_REGISTRATION defaults to false; first admin is bootstrap-admin.sh (createsuperuser), not public signup."
echo "Then on the VM: sudo systemctl restart glitchtip-bootstrap.service glitchtip-bootstrap-admin.service"
