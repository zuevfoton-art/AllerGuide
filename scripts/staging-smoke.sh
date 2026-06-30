#!/usr/bin/env bash
# Post-deploy smoke for staging API (P1.1c / P1.1e).
set -euo pipefail

BASE="${STAGING_API_URL:-${1:-https://api.staging.allerguide.app}}"
BASE="${BASE%/}"

echo "Smoke: GET $BASE/api/health"
response="$(curl -sf "$BASE/api/health")"
echo "$response" | jq . 2>/dev/null || echo "$response"

if command -v jq >/dev/null 2>&1; then
  ok="$(echo "$response" | jq -r '.ok')"
  if [ "$ok" != "true" ]; then
    echo "Health check failed: ok=$ok" >&2
    exit 1
  fi
fi

echo "Staging smoke passed."
