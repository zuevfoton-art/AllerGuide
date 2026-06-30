#!/usr/bin/env bash
# API-level auth smoke for staging (P1.2c). Complements mobile E2E in qa-checklist.
set -euo pipefail

BASE="${STAGING_API_URL:-${1:-https://api.staging.allerguide.app}}"
BASE="${BASE%/}"

RAND="${RAND:-$(date +%s)}"
EMAIL="staging-smoke-${RAND}@example.com"
PASSWORD="SmokeTest1!"

echo "Staging auth smoke: $BASE"
echo "Test user: $EMAIL"

health="$(curl -sf "$BASE/api/health")"
echo "Health: $health"

register="$(curl -sf -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"loginType\":\"email\",\"login\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"confirmPassword\":\"$PASSWORD\"}")"
echo "Register: $register"

TOKEN="$(echo "$register" | jq -r '.token')"
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Register failed: no token" >&2
  exit 1
fi

login="$(curl -sf -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"loginType\":\"email\",\"login\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")"
LOGIN_TOKEN="$(echo "$login" | jq -r '.token')"
if [ -z "$LOGIN_TOKEN" ] || [ "$LOGIN_TOKEN" = "null" ]; then
  echo "Login failed: no token" >&2
  exit 1
fi

me="$(curl -sf "$BASE/api/auth/me" -H "Authorization: Bearer $LOGIN_TOKEN")"
USER_ID="$(echo "$me" | jq -r '.user.id')"
if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
  echo "/api/auth/me failed" >&2
  exit 1
fi

echo "Auth smoke passed (user id=$USER_ID)."
