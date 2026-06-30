#!/usr/bin/env bash
# Build Android debug APK for Maestro E2E (preview offline or staging + optional local API).
# Usage: ./scripts/maestro-build-apk.sh [preview|staging]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROFILE="${1:-preview}"
cd "$ROOT"

if [ -z "${ANDROID_HOME:-}" ]; then
  echo "ANDROID_HOME is not set. Install Android SDK (platform 35, build-tools 35)." >&2
  exit 1
fi

case "$PROFILE" in
  preview)
    export EXPO_PUBLIC_BACKEND_AUTH=false
    export EXPO_PUBLIC_CLOUD_SYNC=false
    export EXPO_PUBLIC_AI_SCAN_ENABLED=false
    export EXPO_PUBLIC_PRODUCT_DB=false
    export EXPO_PUBLIC_ANALYTICS_ENABLED=false
  ;;
  staging)
    export EXPO_PUBLIC_API_URL="${MAESTRO_API_URL:-http://10.0.2.2:3001}"
    export EXPO_PUBLIC_BACKEND_AUTH=true
    export EXPO_PUBLIC_CLOUD_SYNC=true
    export EXPO_PUBLIC_AI_SCAN_ENABLED=false
    export EXPO_PUBLIC_PRODUCT_DB=false
    export EXPO_PUBLIC_ANALYTICS_ENABLED=false
    export EXPO_PUBLIC_MAESTRO_TEST_RECOVERY_KEY="${MAESTRO_TEST_RECOVERY_KEY:-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb}"
  ;;
  *)
    echo "Unknown profile: $PROFILE (use preview or staging)" >&2
    exit 1
  ;;
esac

echo "Maestro APK build profile=$PROFILE"
echo "EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL:-<unset>}"

pnpm install --frozen-lockfile

cd apps/mobile
pnpm generate-assets || true
npx expo prebuild --platform android --no-install

cd android
./gradlew assembleDebug --no-daemon

APK="$PWD/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "APK ready: $APK"
echo "Install: adb install -r $APK"
