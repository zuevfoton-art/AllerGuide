#!/usr/bin/env bash
# First EAS preview build (macOS / Linux / Git Bash)
# Usage: ./scripts/first-preview-build.sh [android|ios|all]

set -euo pipefail

PLATFORM="${1:-android}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/mobile"

echo "=== AllerGuide — first EAS preview build ($PLATFORM) ==="

if ! pnpm exec eas whoami >/dev/null 2>&1; then
  echo "Not logged in to Expo. Run: pnpm exec eas login"
  pnpm exec eas login
fi

PROJECT_ID=$(node -p "require('./app.json').expo.extra.eas.projectId")
if [[ "$PROJECT_ID" == "00000000-0000-0000-0000-000000000000" ]]; then
  echo "Linking Expo project..."
  pnpm exec eas init
  echo "Commit the updated app.json projectId."
fi

case "$PLATFORM" in
  android) pnpm build:preview:android ;;
  ios)     pnpm build:preview:ios ;;
  all)     pnpm build:preview ;;
  *)
    echo "Unknown platform: $PLATFORM (use android, ios, or all)"
    exit 1
    ;;
esac

echo ""
echo "Build queued. Track at https://expo.dev → AllerGuide → Builds"
echo "After install, run docs/qa-checklist.md"
