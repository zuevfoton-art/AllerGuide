#!/usr/bin/env bash
# Install the Maestro APK on a booted emulator, grant runtime permissions,
# run flows, and dump logcat if Maestro fails (emulator-runner kills AVD after this).
#
# Usage: ./scripts/maestro-run-emulator.sh preview|staging
set -euo pipefail

PROFILE="${1:-preview}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APK="$ROOT/apps/mobile/android/app/build/outputs/apk/release/app-release.apk"
PACKAGE='com.aclearo.app'

if [ ! -f "$APK" ]; then
  echo "ERROR: missing $APK" >&2
  exit 1
fi

adb install -r "$APK"

for perm in \
  android.permission.POST_NOTIFICATIONS \
  android.permission.ACCESS_FINE_LOCATION \
  android.permission.ACCESS_COARSE_LOCATION \
  android.permission.CAMERA \
  android.permission.RECORD_AUDIO; do
  adb shell pm grant "$PACKAGE" "$perm" || true
done

case "$PROFILE" in
  preview)
    FLOW="$ROOT/apps/mobile/.maestro/flows/smoke-all.yaml"
    REPORT='maestro-offline-report.xml'
    DEBUG='maestro-offline-debug'
    LOGCAT='maestro-offline-logcat.txt'
    ;;
  staging)
    FLOW="$ROOT/apps/mobile/.maestro/flows/staging-smoke-all.yaml"
    REPORT='maestro-staging-report.xml'
    DEBUG='maestro-staging-debug'
    LOGCAT='maestro-staging-logcat.txt'
    ;;
  *)
    echo "Unknown profile: $PROFILE (use preview or staging)" >&2
    exit 1
    ;;
esac

set +e
maestro test --format junit --output "$REPORT" --debug-output "$DEBUG" "$FLOW"
rc=$?
set -e
adb logcat -d -t 500 'ReactNativeJS:*' 'ReactNative:*' 'AndroidRuntime:E' '*:E' > "$LOGCAT" || true
exit "$rc"
