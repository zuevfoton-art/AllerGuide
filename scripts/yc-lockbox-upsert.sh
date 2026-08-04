#!/usr/bin/env bash
# Merge or update Lockbox entries without dropping existing keys.
# Usage:
#   yc lockbox payload helpers — requires `yc` configured (SA key).
#   ./scripts/yc-lockbox-upsert.sh KEY=VALUE [KEY=VALUE ...]
#   GOOGLE_POLLEN_API_KEY=... ./scripts/yc-lockbox-upsert.sh --pollen
#   YANDEX_MAPS_JS_API_KEY=... ./scripts/yc-lockbox-upsert.sh --yandex-maps
#
# Env:
#   YC_LOCKBOX_SECRET_ID  (default: staging id from yc-ai-phase0-smoke)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCKBOX_ID="${YC_LOCKBOX_SECRET_ID:-e6qs399v1b3unstfh5rj}"

need_yc() {
  if ! command -v yc >/dev/null 2>&1; then
    echo "yc CLI not found. Install: https://cloud.yandex.ru/docs/cli/quickstart" >&2
    exit 2
  fi
}

entries_to_json_pairs() {
  # stdin: lines key=value  →  JSON array of {key,text_value}
  # Use -c (not heredoc) so a pipe can feed stdin.
  python3 -c '
import json, sys
out = []
for raw in sys.stdin:
    line = raw.rstrip("\n")
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    out.append({"key": key, "text_value": value})
print(json.dumps(out))
'
}

merge_payload() {
  local updates_json="$1"
  local current
  current="$(yc lockbox payload get --id "$LOCKBOX_ID" --format json)"
  python3 - "$current" "$updates_json" <<'PY'
import json, sys
current = json.loads(sys.argv[1])
updates = {u["key"]: u["text_value"] for u in json.loads(sys.argv[2])}
merged = {}
for entry in current.get("entries") or []:
    merged[entry["key"]] = entry.get("text_value") or entry.get("binary_value") or ""
merged.update(updates)
payload = [{"key": k, "text_value": v} for k, v in merged.items()]
print(json.dumps(payload))
PY
}

need_yc

UPDATES=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --pollen)
      : "${GOOGLE_POLLEN_API_KEY:?Set GOOGLE_POLLEN_API_KEY to the Pollen API server key}"
      UPDATES+=(
        "POLLEN_HEATMAP_ENABLED=true"
        "GOOGLE_POLLEN_API_KEY=${GOOGLE_POLLEN_API_KEY}"
        "POLLEN_RATE_LIMIT_WINDOW_MS=${POLLEN_RATE_LIMIT_WINDOW_MS:-60000}"
        "POLLEN_RATE_LIMIT_MAX=${POLLEN_RATE_LIMIT_MAX:-120}"
      )
      shift
      ;;
    --yandex-maps)
      : "${YANDEX_MAPS_JS_API_KEY:?Set YANDEX_MAPS_JS_API_KEY (Yandex Maps JS API key)}"
      UPDATES+=(
        "YANDEX_MAPS_INTERACTIVE_ENABLED=true"
        "YANDEX_MAPS_JS_API_KEY=${YANDEX_MAPS_JS_API_KEY}"
        "MAPS_RATE_LIMIT_WINDOW_MS=${MAPS_RATE_LIMIT_WINDOW_MS:-60000}"
        "MAPS_RATE_LIMIT_MAX=${MAPS_RATE_LIMIT_MAX:-60}"
      )
      shift
      ;;
    *=*)
      UPDATES+=("$1")
      shift
      ;;
    *)
      echo "Expected --pollen | --yandex-maps | KEY=VALUE, got: $1" >&2
      exit 2
      ;;
  esac
done

if [[ "${#UPDATES[@]}" -eq 0 ]]; then
  echo "Usage: $0 --pollen | --yandex-maps | KEY=VALUE ..." >&2
  exit 2
fi

UPDATES_JSON="$(printf '%s\n' "${UPDATES[@]}" | entries_to_json_pairs)"
MERGED="$(merge_payload "$UPDATES_JSON")"

echo "Adding Lockbox version on $LOCKBOX_ID (keys: $(echo "$UPDATES_JSON" | python3 -c 'import json,sys; print(",".join(u["key"] for u in json.load(sys.stdin)))'))"
yc lockbox secret add-version --id "$LOCKBOX_ID" --payload "$MERGED" >/dev/null
echo "Lockbox version added."
