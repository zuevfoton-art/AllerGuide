#!/usr/bin/env bash
# Classify an eas-cli Android build log.
# Expo Free-plan monthly quota is a skip (Gradle APK is the fallback), not a job failure.
#
# Usage:
#   eas-android-quota.sh is-quota <logfile>
#   eas-android-quota.sh apply <eas-exit-code> <logfile>
#
# Used by .github/workflows/eas-staging-android.yml
set -euo pipefail

usage() {
  echo "Usage: $0 is-quota <logfile>" >&2
  echo "       $0 apply <eas-exit-code> <logfile>" >&2
  exit 2
}

is_free_plan_android_quota() {
  local log_file="$1"
  if [ ! -f "$log_file" ]; then
    return 1
  fi
  # eas-cli 22 (Actions run 35079317476):
  # "This account has used its Android builds from the Free plan this month..."
  grep -qE 'used its Android builds from the Free plan' "$log_file"
}

cmd="${1:-}"
case "$cmd" in
  is-quota)
    [ "${#}" -eq 2 ] || usage
    if is_free_plan_android_quota "$2"; then
      exit 0
    fi
    exit 1
    ;;
  apply)
    [ "${#}" -eq 3 ] || usage
    status="$2"
    log_file="$3"
    if ! [[ "$status" =~ ^[0-9]+$ ]]; then
      echo "::error::eas-android-quota apply: exit code must be an integer, got: ${status}" >&2
      exit 1
    fi
    if [ "$status" -eq 0 ]; then
      exit 0
    fi
    if is_free_plan_android_quota "$log_file"; then
      echo "::warning::EAS Android failed: Expo Free-plan monthly quota after a successful upload. Retry after quota reset or a paid plan."
      echo "::warning::APK without Expo cloud: Actions → Staging Android APK (Gradle) · docs/android-stage-build.md §C · staging-apk-gradle.yml"
      exit 0
    fi
    echo "::error::EAS Android build failed (not a Free-plan quota skip)."
    exit "$status"
    ;;
  *)
    usage
    ;;
esac
