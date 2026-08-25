#!/usr/bin/env bash
# Install the Maestro APK on a booted emulator, grant runtime permissions,
# warm the process, run flows, and dump diagnostics if Maestro fails.
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

# First process start on a cold emulator pays dex/Hermes; Maestro then launches
# a second time after clearState and is less likely to sit on a blank splash.
adb shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1 >/dev/null || true
sleep 15
adb shell am force-stop "$PACKAGE" || true

case "$PROFILE" in
  preview)
    PREFIX='maestro-offline'
    FLOW="$ROOT/apps/mobile/.maestro/flows/smoke-all.yaml"
    ;;
  staging)
    PREFIX='maestro-staging'
    FLOW="$ROOT/apps/mobile/.maestro/flows/staging-smoke-all.yaml"
    ;;
  *)
    echo "Unknown profile: $PROFILE (use preview or staging)" >&2
    exit 1
    ;;
esac

REPORT="${PREFIX}-report.xml"
DEBUG="${PREFIX}-debug"
LOGCAT="${PREFIX}-logcat.txt"
SCREEN="${PREFIX}-screen.png"
UIDUMP="${PREFIX}-ui.xml"

adb logcat -c || true
adb logcat -v time 'ReactNativeJS:V' 'ReactNative:V' 'AndroidRuntime:E' 'Expo:V' '*:S' > "$LOGCAT" &
LOGCAT_PID=$!
cleanup() {
  kill "$LOGCAT_PID" 2>/dev/null || true
}
trap cleanup EXIT

set +e
maestro test --format junit --output "$REPORT" --debug-output "$DEBUG" "$FLOW"
rc=$?
set -e
cleanup
trap - EXIT

if [ "$rc" -ne 0 ]; then
  adb exec-out screencap -p > "$SCREEN" || true
  adb shell uiautomator dump /sdcard/window_dump.xml >/dev/null || true
  adb pull /sdcard/window_dump.xml "$UIDUMP" >/dev/null || true
fi

exit "$rc"
