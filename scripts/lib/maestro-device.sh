#!/usr/bin/env bash
# Emulator state helpers for the Maestro nightly runner.
#
# Sourced by scripts/maestro-run-emulator.sh and exercised directly by
# scripts/maestro-device.test.mjs with a fake `adb` on PATH.
#
# Callers must define PACKAGE, ACTIVITY, ANR_WAIT_X and ANR_WAIT_Y.

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

resumed_activity() {
  adb shell dumpsys activity activities 2>/dev/null |
    grep -E 'mResumedActivity|topResumedActivity' || true
}

# The resumed activity is the only reliable foreground signal on API 34 AVDs.
# `dumpsys window | grep mCurrentFocus` prints one line per display and keeps a
# stale NexusLauncher entry next to the live app window, so matching on it
# reported the launcher for a whole nightly run (33414517311).
app_is_foreground() {
  resumed_activity | grep -q "$PACKAGE"
}

# After warmup / clearState the AVD can sit on NexusLauncher (app drawer).
# Bring MainActivity back — singleTask resumes the existing task. Never do this
# while the app is already resumed: `am start` re-delivers the launch intent and
# expo-router pops back to the initial route, which killed the diary wizard
# mid-suite in nightly 33414517311.
ensure_app_foreground() {
  dismiss_anr
  if app_is_foreground; then
    return 0
  fi
  echo "App not resumed — am start ${ACTIVITY}" >&2
  adb shell am start -W -n "$ACTIVITY" >/dev/null || true
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
    adb shell dumpsys window 2>/dev/null |
      grep -E 'mCurrentFocus|Application Not Responding|Application Error' || true
    echo "=== mResumedActivity ==="
    resumed_activity
  } > "$1" || true
}

is_post_exit_launcher() {
  [ -f "$1" ] && grep -Eqi 'nexuslauncher|Pixel Launcher isn|com.google.android.apps.nexuslauncher' "$1"
}
