#!/usr/bin/env bash
# Smoke: Places API (New) + Air Quality enabled on staging API.
set -euo pipefail

BASE="${STAGING_API_URL:-${1:-https://api.staging.aclearo.com}}"
BASE="${BASE%/}"
LAT="${SMOKE_LAT:-55.75}"
LON="${SMOKE_LON:-37.62}"

echo "Places + Air Quality smoke: $BASE"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq required" >&2
  exit 2
fi

health="$(curl -sf --max-time 30 "$BASE/api/health")"
echo "$health" | jq -c '{ok, features}'

map_places="$(echo "$health" | jq -r '.features.mapPlaces // false')"
air_quality="$(echo "$health" | jq -r '.features.airQuality // false')"
if [[ "$map_places" != "true" ]]; then
  echo "FAIL: features.mapPlaces=$map_places (expected true). Set Lockbox MAP_PLACES_ENABLED + GOOGLE_PLACES_API_KEY, deploy an image that reports mapPlaces, and remount." >&2
  exit 1
fi
if [[ "$air_quality" != "true" ]]; then
  echo "FAIL: features.airQuality=$air_quality (expected true). Set Lockbox AIR_QUALITY_ENABLED + GOOGLE_AIR_QUALITY_API_KEY and redeploy." >&2
  exit 1
fi
echo "PASS: features.mapPlaces=true features.airQuality=true"

places_tmp="$(mktemp)"
places_code="$(curl -sS -o "$places_tmp" -w '%{http_code}' --max-time 45 \
  "${BASE}/api/places/nearby?lat=${LAT}&lon=${LON}&type=cafe" || true)"
if [[ "$places_code" != "200" ]]; then
  echo "FAIL: places nearby HTTP $places_code" >&2
  head -c 400 "$places_tmp" >&2 || true
  rm -f "$places_tmp"
  exit 1
fi
places_ok="$(jq -r '.ok // false' "$places_tmp")"
places_count="$(jq -r '.places | length' "$places_tmp")"
rm -f "$places_tmp"
if [[ "$places_ok" != "true" ]]; then
  echo "FAIL: places nearby ok!=true" >&2
  exit 1
fi
echo "PASS: places nearby HTTP 200 (count=$places_count)"

aq_tmp="$(mktemp)"
aq_code="$(curl -sS -o "$aq_tmp" -w '%{http_code}' --max-time 45 \
  "${BASE}/api/air-quality/current?lat=${LAT}&lon=${LON}&lang=ru" || true)"
if [[ "$aq_code" != "200" ]]; then
  echo "FAIL: air-quality current HTTP $aq_code" >&2
  head -c 400 "$aq_tmp" >&2 || true
  rm -f "$aq_tmp"
  exit 1
fi
aq_ok="$(jq -r '.ok // false' "$aq_tmp")"
aq_index="$(jq -r '.airQuality.universal.aqi // empty' "$aq_tmp")"
rm -f "$aq_tmp"
if [[ "$aq_ok" != "true" ]]; then
  echo "FAIL: air-quality current ok!=true" >&2
  exit 1
fi
echo "PASS: air-quality current HTTP 200 (index=${aq_index:-n/a})"
echo "Places + Air Quality smoke passed."
