#!/usr/bin/env bash
# Smoke: pollen heatmap enabled on staging API (Phase 1).
set -euo pipefail

BASE="${STAGING_API_URL:-${1:-https://api.staging.aclearo.com}}"
BASE="${BASE%/}"
# Stable tile near mid latitudes; Google may 404 for empty cells — we accept 200 PNG or
# upstream 404 JSON from our proxy once the route is mounted.
TILE_PATH="/api/pollen/heatmap/TREE_UPI/6/38/20"

echo "Pollen smoke: $BASE"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq required" >&2
  exit 2
fi

health="$(curl -sf --max-time 30 "$BASE/api/health")"
echo "$health" | jq -c '{ok, features}'

pollen="$(echo "$health" | jq -r '.features.pollenHeatmap // false')"
if [[ "$pollen" != "true" ]]; then
  echo "FAIL: features.pollenHeatmap=$pollen (expected true). Set Lockbox POLLEN_HEATMAP_ENABLED + GOOGLE_POLLEN_API_KEY and redeploy." >&2
  exit 1
fi
echo "PASS: features.pollenHeatmap=true"

tmp="$(mktemp)"
code="$(curl -sS -o "$tmp" -w '%{http_code}' --max-time 45 "${BASE}${TILE_PATH}" || true)"
ctype="$(file -b --mime-type "$tmp" 2>/dev/null || echo unknown)"

case "$code" in
  200)
    if [[ "$ctype" == "image/png" ]] || head -c 8 "$tmp" | grep -q $'\x89PNG'; then
      echo "PASS: tile HTTP 200 PNG (${TILE_PATH})"
    else
      echo "FAIL: HTTP 200 but not PNG (ctype=$ctype)" >&2
      head -c 200 "$tmp" >&2 || true
      rm -f "$tmp"
      exit 1
    fi
    ;;
  404)
    # Route mounted + configured; empty/unavailable Google cell is acceptable for smoke.
    if head -c 1 "$tmp" | grep -q '{'; then
      echo "PASS: tile HTTP 404 JSON from pollen proxy (route live; cell may be empty)"
    else
      echo "FAIL: HTTP 404 HTML — pollen routes likely missing from the deployed image. Redeploy latest apps/api." >&2
      head -c 200 "$tmp" >&2 || true
      rm -f "$tmp"
      exit 1
    fi
    ;;
  503)
    echo "FAIL: HTTP 503 — heatmap disabled in running revision" >&2
    cat "$tmp" >&2 || true
    rm -f "$tmp"
    exit 1
    ;;
  *)
    echo "FAIL: unexpected tile HTTP $code ctype=$ctype" >&2
    head -c 300 "$tmp" >&2 || true
    rm -f "$tmp"
    exit 1
    ;;
esac

rm -f "$tmp"
echo "Pollen smoke passed."
