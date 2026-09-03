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

# shellcheck source=scripts/lib/maestro-device.sh
. "$ROOT/scripts/lib/maestro-device.sh"

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
# `~/.maestro/tests` never matched in upload-artifact (it does not expand `~`),
# so per-command logs were lost on every red nightly. Copy them next to the
# report instead.
MAESTRO_LOGS="${PREFIX}-maestro-logs"

adb logcat -c || true
adb logcat -v time 'ReactNativeJS:V' 'ReactNative:V' 'AndroidRuntime:E' 'Expo:V' '*:S' > "$LOGCAT" &
LOGCAT_PID=$!

# The sampler only observes: Maestro owns app lifecycle inside a flow, and an
# `am start` from here re-delivers the launch intent and pops expo-router back
# to the initial route (nightly 33414517311 lost the diary wizard that way).
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
ensure_app_foreground
capture_screen "$SCREEN"
if [ "$rc" -ne 0 ]; then
  capture_ui "$UIDUMP"
  if is_post_exit_launcher "$UIDUMP" && [ -s "$DURING_SCREEN" ]; then
    echo "Post-exit UI is the launcher — keeping ${DURING_SCREEN} as ${SCREEN}" >&2
    cp "$DURING_SCREEN" "$SCREEN"
  fi
fi

rm -rf "$MAESTRO_LOGS"
mkdir -p "$MAESTRO_LOGS"
cp -R "$HOME/.maestro/tests/." "$MAESTRO_LOGS/" 2>/dev/null || true

cleanup
trap - EXIT

exit "$rc"
