#!/usr/bin/env bash
# Merge or update Lockbox entries without dropping existing keys.
# Usage:
#   yc lockbox payload helpers — requires `yc` configured (SA key).
#   ./scripts/yc-lockbox-upsert.sh KEY=VALUE [KEY=VALUE ...]
#   GOOGLE_POLLEN_API_KEY=... ./scripts/yc-lockbox-upsert.sh --pollen
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
  python3 - <<'PY'
import json, sys
out = []
for raw in sys.stdin:
    line = raw.rstrip("\n")
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    out.append({"key": key, "text_value": value})
print(json.dumps(out))
PY
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
if [[ "${1:-}" == "--pollen" ]]; then
  : "${GOOGLE_POLLEN_API_KEY:?Set GOOGLE_POLLEN_API_KEY to the Pollen API server key}"
  UPDATES+=(
    "POLLEN_HEATMAP_ENABLED=true"
    "GOOGLE_POLLEN_API_KEY=${GOOGLE_POLLEN_API_KEY}"
    "POLLEN_RATE_LIMIT_WINDOW_MS=${POLLEN_RATE_LIMIT_WINDOW_MS:-60000}"
    "POLLEN_RATE_LIMIT_MAX=${POLLEN_RATE_LIMIT_MAX:-120}"
  )
  shift
fi

for arg in "$@"; do
  if [[ "$arg" != *=* ]]; then
    echo "Expected KEY=VALUE, got: $arg" >&2
    exit 2
  fi
  UPDATES+=("$arg")
done

if [[ "${#UPDATES[@]}" -eq 0 ]]; then
  echo "Usage: $0 --pollen | KEY=VALUE ..." >&2
  exit 2
fi

UPDATES_JSON="$(printf '%s\n' "${UPDATES[@]}" | entries_to_json_pairs)"
MERGED="$(merge_payload "$UPDATES_JSON")"

echo "Adding Lockbox version on $LOCKBOX_ID (keys: $(echo "$UPDATES_JSON" | python3 -c 'import json,sys; print(",".join(u["key"] for u in json.load(sys.stdin)))'))"
yc lockbox secret add-version --id "$LOCKBOX_ID" --payload "$MERGED" >/dev/null
echo "Lockbox version added."
