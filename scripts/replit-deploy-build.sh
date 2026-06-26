#!/usr/bin/env bash
# Replit Deploy build: install deps, export web PWA.
# Migrations run at API startup (apps/api/src/index.ts) — not during build.
set -euo pipefail

export COREPACK_ENABLE_STRICT=0

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/replit-db-env.sh
source "$ROOT/scripts/replit-db-env.sh"

pnpm install --frozen-lockfile=false

cd apps/mobile
COREPACK_ENABLE_STRICT=0 npx expo export --platform web --output-dir dist
