#!/usr/bin/env bash
# Replit Deploy build: install deps, export web PWA.
# NOTE: Schema migrations to production are handled automatically by Replit's
# Publish flow (SQL diff dev→prod). Do NOT run db:push/db:migrate here.
set -euo pipefail

export COREPACK_ENABLE_STRICT=0

pnpm install --frozen-lockfile=false

cd apps/mobile
COREPACK_ENABLE_STRICT=0 npx expo export --platform web --output-dir dist
