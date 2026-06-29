#!/usr/bin/env bash
# Runs on EAS Build servers before pnpm install (apps/mobile/package.json → eas-build-pre-install).
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Project root is one level up from scripts/ (i.e. apps/mobile in the monorepo,
# or the extracted project root on EAS servers).
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

corepack enable
corepack prepare pnpm@10.34.4 --activate

echo "EAS pre-install: pnpm $(pnpm --version), node $(node --version)"
