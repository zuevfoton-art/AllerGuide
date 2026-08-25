#!/usr/bin/env bash
# Install the Maestro APK on a booted emulator, grant runtime permissions,
# warm the process without poking Pixel Launcher, run flows, and dump
# diagnostics while the app is still in the failed state.
#
# Usage: ./scripts/maestro-run-emulator.sh preview|staging
set -euo pipefail

PROFILE="${1:-preview}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APK="$ROOT/apps/mobile/android/app/build/outputs/apk/release/app-release.apk"
PACKAGE='com.aclearo.app'
# Expo launcher activity — see apps/mobile/android/app/src/main/AndroidManifest.xml
ACTIVITY='com.aclearo.app/.MainActivity'
# Pixel 6 (1080×2400) ANR "Wait" button center from 2026-08-25 nightly dump.
ANR_WAIT_X=540
ANR_WAIT_Y=1359
WARMUP_SECONDS=15
SAMPLER_SECONDS=8

if [ ! -f "$APK" ]; then
  echo "ERROR: missing $APK" >&2
  exit 1
fi

has_anr_dialog() {
  adb shell dumpsys window 2>/dev/null | grep -Eqi 'Application Error|aerr_wait|isn.t responding'
}

# Prefer Wait over Close so the process can recover. dumpsys + tap only —
# uiautomator dump races Maestro's UiAutomation connection.
dismiss_anr() {
  has_anr_dialog || return 0
  echo "ANR dialog detected — tapping Wait" >&2
  adb shell input tap "$ANR_WAIT_X" "$ANR_WAIT_Y" || true
  sleep 1
  if has_anr_dialog; then
    adb shell input keyevent KEYCODE_BACK || true
  fi
}

capture_screen() {
  adb exec-out screencap -p > "$1" || true
}

capture_ui() {
  adb shell uiautomator dump /sdcard/window_dump.xml >/dev/null 2>&1 || true
  adb pull /sdcard/window_dump.xml "$1" >/dev/null 2>&1 || true
}

capture_focus() {
  {
    echo "=== mCurrentFocus ==="
    adb shell dumpsys window 2>/dev/null | grep -E 'mCurrentFocus|Application Error' || true
    echo "=== mResumedActivity ==="
    adb shell dumpsys activity activities 2>/dev/null | grep -E 'mResumedActivity|topResumedActivity' || true
  } > "$1" || true
}

is_post_exit_launcher() {
  [ -f "$1" ] && grep -Eqi 'nexuslauncher|Pixel Launcher isn|com.google.android.apps.nexuslauncher' "$1"
}

adb install -r "$APK"

for perm in \
  android.permission.POST_NOTIFICATIONS \
  android.permission.ACCESS_FINE_LOCATION \
  android.permission.ACCESS_COARSE_LOCATION \
  android.permission.CAMERA \
  android.permission.RECORD_AUDIO; do
  adb shell pm grant "$PACKAGE" "$perm" || true
done

# First process start pays dex/Hermes. `monkey` opens the app drawer and
# ANRs Pixel Launcher on API 34 CI AVDs — start the activity directly.
adb shell am start -W -n "$ACTIVITY" >/dev/null || true
sleep "$WARMUP_SECONDS"
dismiss_anr
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
DURING_SCREEN="${PREFIX}-during.png"
DURING_FOCUS="${PREFIX}-during-focus.txt"
SAMPLER_GUARD="${PREFIX}-sampler.guard"

adb logcat -c || true
adb logcat -v time 'ReactNativeJS:V' 'ReactNative:V' 'AndroidRuntime:E' 'Expo:V' '*:S' > "$LOGCAT" &
LOGCAT_PID=$!

touch "$SAMPLER_GUARD"
(
  while [ -f "$SAMPLER_GUARD" ]; do
    dismiss_anr
    capture_screen "$DURING_SCREEN"
    capture_focus "$DURING_FOCUS"
    sleep "$SAMPLER_SECONDS"
  done
) &
SAMPLER_PID=$!

cleanup() {
  rm -f "$SAMPLER_GUARD"
  kill "$SAMPLER_PID" 2>/dev/null || true
  kill "$LOGCAT_PID" 2>/dev/null || true
  wait "$SAMPLER_PID" 2>/dev/null || true
}

trap cleanup EXIT

set +e
maestro test --format junit --output "$REPORT" --debug-output "$DEBUG" "$FLOW"
rc=$?
set -e

# Keep the last in-flow frame, then snapshot after Maestro returns.
dismiss_anr
capture_screen "$SCREEN"
if [ "$rc" -ne 0 ]; then
  capture_ui "$UIDUMP"
  if is_post_exit_launcher "$UIDUMP" && [ -s "$DURING_SCREEN" ]; then
    echo "Post-exit UI is the launcher — keeping ${DURING_SCREEN} as ${SCREEN}" >&2
    cp "$DURING_SCREEN" "$SCREEN"
  fi
fi

cleanup
trap - EXIT

exit "$rc"
