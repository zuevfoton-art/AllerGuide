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

# dumpsys uses "Application Not Responding: …nexuslauncher", not the
# dialog title "Pixel Launcher isn't responding" (#296 nightly 32861098818).
has_anr_dialog() {
  adb shell dumpsys window 2>/dev/null | grep -Eqi \
    'Application Not Responding|Application Error|aerr_wait|isn.t responding|Pixel Launcher isn'
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

window_focus() {
  adb shell dumpsys window 2>/dev/null | grep mCurrentFocus || true
}

# True when Pixel Launcher owns the foreground and there is no ANR overlay.
launcher_is_focused() {
  local focus
  focus="$(window_focus)"
  if echo "$focus" | grep -Eqi 'Application Not Responding'; then
    return 1
  fi
  if echo "$focus" | grep -Eqi 'nexuslauncher'; then
    return 0
  fi
  return 1
}

# After warmup/clearState the AVD often sits on NexusLauncher (app drawer).
# Bring MainActivity back — singleTask resumes the existing task.
ensure_app_foreground() {
  dismiss_anr
  if launcher_is_focused; then
    echo "NexusLauncher in focus — am start ${ACTIVITY}" >&2
    adb shell am start -W -n "$ACTIVITY" >/dev/null || true
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
    adb shell dumpsys window 2>/dev/null | grep -E 'mCurrentFocus|Application Not Responding|Application Error' || true
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

# API 34 emulator Autofill/Password Manager steals focus from Maestro inputText
# (offline register: truncated phone + 3-char password).
adb shell settings put secure autofill_service null || true
# Pixel Launcher ANRs mid-flow on this AVD and its dialog swallows the next tap
# (nightly 33394028058: register tap lost, still on /login). Suppress the
# dialogs system-wide; dismiss_anr stays as a fallback for older images.
adb shell settings put global hide_error_dialogs 1 || true

# First process start pays dex/Hermes. `monkey` opens the app drawer and
# ANRs Pixel Launcher on API 34 CI AVDs — start the activity directly.
adb shell am start -W -n "$ACTIVITY" >/dev/null || true
sleep "$WARMUP_SECONDS"
ensure_app_foreground
adb shell am force-stop "$PACKAGE" || true
# force-stop returns to the launcher; dismiss a leftover ANR so Maestro
# launchApp does not start behind the dialog.
ensure_app_foreground

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
    ensure_app_foreground
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
ensure_app_foreground
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
