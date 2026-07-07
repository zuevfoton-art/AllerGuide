#!/usr/bin/env bash
# Staging preflight before closed beta (P1.7). Runs all API smoke scripts in order.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export STAGING_API_URL="${STAGING_API_URL:-https://api.staging.aclearo.com}"
export STAGING_API_URL="${STAGING_API_URL%/}"

echo "=== AllerGuide staging preflight (P1.7) ==="
echo "Target: $STAGING_API_URL"
echo ""

for script in staging-smoke.sh staging-auth-smoke.sh staging-sync-smoke.sh staging-scan-smoke.sh; do
  path="$ROOT/scripts/$script"
  if [[ ! -x "$path" ]]; then
    chmod +x "$path"
  fi
  echo "--- $script ---"
  "$path"
  echo ""
done

echo "Preflight passed. Safe to distribute EAS staging build to closed beta testers."
echo "Next: docs/closed-beta-p17.md"
