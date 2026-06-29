#!/usr/bin/env bash
# Replit Deploy build: install deps, apply Drizzle migrations to production DB, export web PWA.
set -euo pipefail

export COREPACK_ENABLE_STRICT=0

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/replit-db-env.sh
source "$ROOT/scripts/replit-db-env.sh"

pnpm install --frozen-lockfile=false

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Applying database migrations (DATABASE_URL is set)..."
  pnpm --filter api db:migrate
else
  echo "DATABASE_URL is not set — skipping migrations."
fi

cd apps/mobile
COREPACK_ENABLE_STRICT=0 npx expo export --platform web --output-dir dist
