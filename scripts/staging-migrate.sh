#!/usr/bin/env bash
# Apply Drizzle migrations to staging Neon (P1.1a smoke).
# Requires: DATABASE_URL, DIRECT_DATABASE_URL (and optionally DB_SSL, DB_PREPARE).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -z "${DATABASE_URL:-}" ] && [ -z "${DIRECT_DATABASE_URL:-}" ]; then
  echo "Error: set DATABASE_URL and DIRECT_DATABASE_URL (Neon staging)." >&2
  echo "See docs/staging-deploy.md § P1.1a" >&2
  exit 1
fi

export DB_SSL="${DB_SSL:-require}"
export DB_PREPARE="${DB_PREPARE:-false}"

echo "Staging migrate: DB_SSL=$DB_SSL DB_PREPARE=$DB_PREPARE"
pnpm install --frozen-lockfile
pnpm --filter api db:migrate
echo "Staging migrations applied."
