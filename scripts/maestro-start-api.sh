#!/usr/bin/env bash
# Start API for Maestro staging E2E (CI / local). Waits until /api/health is ready.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export DATABASE_URL="${DATABASE_URL:-postgresql://allerguide:allerguide@localhost:5432/allerguide_test?sslmode=disable}"
export DIRECT_DATABASE_URL="${DIRECT_DATABASE_URL:-$DATABASE_URL}"
export DB_SSL="${DB_SSL:-disable}"
export JWT_SECRET="${JWT_SECRET:-maestro-ci-jwt-secret-32-characters}"
export SYNC_ENABLED="${SYNC_ENABLED:-true}"
export AI_SCAN_ENABLED="${AI_SCAN_ENABLED:-false}"
export RATE_LIMIT_DISABLED="${RATE_LIMIT_DISABLED:-true}"
export PORT="${PORT:-3001}"

pnpm --filter api db:migrate

LOG_FILE="${TMPDIR:-/tmp}/maestro-api.log"
pnpm --filter api start >"$LOG_FILE" 2>&1 &
API_PID=$!
echo "$API_PID" > "${TMPDIR:-/tmp}/maestro-api.pid"

for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
    echo "API ready on port ${PORT} (pid ${API_PID})"
    exit 0
  fi
  sleep 2
done

echo "API failed to start. Log:" >&2
tail -50 "$LOG_FILE" >&2 || true
exit 1
