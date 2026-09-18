#!/usr/bin/env bash
# Post-deploy smoke for staging API (P1.1c / P1.1e / P1.4a).
# Retries health: YC Serverless often cold-starts >10s right after a revision.
set -euo pipefail

BASE="${STAGING_API_URL:-${1:-https://api.staging.aclearo.com}}"
BASE="${BASE%/}"

echo "Smoke: GET $BASE/api/health"
response=""
attempts=8
delay=5
for attempt in $(seq 1 "$attempts"); do
  if response="$(curl -sf --max-time 30 "$BASE/api/health" 2>/dev/null)"; then
    break
  fi
  if [ "$attempt" -eq "$attempts" ]; then
    echo "Health check failed after ${attempts} attempts" >&2
    curl -sS --max-time 30 -w "\nHTTP %{http_code}\n" "$BASE/api/health" >&2 || true
    exit 1
  fi
  echo "  attempt ${attempt}/${attempts} failed — waiting ${delay}s (cold start?)"
  sleep "$delay"
done

echo "$response" | jq . 2>/dev/null || echo "$response"

if command -v jq >/dev/null 2>&1; then
  ok="$(echo "$response" | jq -r '.ok')"
  if [ "$ok" != "true" ]; then
    echo "Health check failed: ok=$ok" >&2
    exit 1
  fi

  sync_enabled="$(echo "$response" | jq -r '.features.sync // empty')"
  if [ -n "$sync_enabled" ] && [ "$sync_enabled" != "true" ]; then
    echo "Health check failed: features.sync=$sync_enabled (expected true on staging)" >&2
    exit 1
  fi

  ai_scan_enabled="$(echo "$response" | jq -r '.features.aiScan // empty')"
  if [ -n "$ai_scan_enabled" ] && [ "$ai_scan_enabled" != "true" ]; then
    echo "Health check failed: features.aiScan=$ai_scan_enabled (expected true on staging, P1.5a)" >&2
    exit 1
  fi
fi

echo "Staging smoke passed."
