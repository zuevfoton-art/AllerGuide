#!/usr/bin/env bash
# Ops check: fail if Map pollen fallback rate is above threshold in the analytics store.
# Requires ANALYTICS_DASHBOARD_ENABLED=true and ANALYTICS_DASHBOARD_KEY on the API.
set -euo pipefail

API_BASE="${API_BASE:-${EXPO_PUBLIC_API_URL:-http://127.0.0.1:3001}}"
API_BASE="${API_BASE%/}"
KEY="${ANALYTICS_DASHBOARD_KEY:-}"

if [[ -z "${KEY}" ]]; then
  echo "ANALYTICS_DASHBOARD_KEY is required" >&2
  exit 2
fi

RESP="$(curl -fsS -H "x-analytics-dashboard-key: ${KEY}" \
  "${API_BASE}/api/ops/map-pollen-health")"

echo "${RESP}"

ALERT="$(node -e 'const j=JSON.parse(process.argv[1]); process.stdout.write(String(Boolean(j.health&&j.health.alert)))' "${RESP}")"
RATE="$(node -e 'const j=JSON.parse(process.argv[1]); process.stdout.write(String(j.health?j.health.fallbackRate:"?"))' "${RESP}")"

echo "map pollen fallbackRate=${RATE} alert=${ALERT}"

if [[ "${ALERT}" == "true" ]]; then
  echo "ALERT: map pollen fallback rate exceeded threshold" >&2
  exit 1
fi
