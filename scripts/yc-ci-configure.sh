#!/usr/bin/env bash
# Configure Yandex Cloud CLI for GitHub Actions with a named profile.
#
# yc 1.35.1 (install.sh "latest") no longer auto-creates a default profile.
# `yc config set service-account-key` then fails with:
#   failed to create active profile '': profile '' was not found
#
# Documented SA flow: create a profile, then attach the key.
# https://yandex.cloud/en/docs/cli/operations/authentication/service-account
#
# Usage: ./scripts/yc-ci-configure.sh /path/to/sa-key.json
set -euo pipefail

KEY_FILE="${1:-}"
PROFILE="${YC_CLI_PROFILE:-github}"

if [[ -z "$KEY_FILE" ]]; then
  echo "Usage: $0 /path/to/sa-key.json" >&2
  exit 2
fi
if [[ ! -f "$KEY_FILE" ]]; then
  echo "Error: service-account key file not found: $KEY_FILE" >&2
  exit 2
fi
if ! command -v yc >/dev/null 2>&1; then
  echo "Error: yc CLI not found on PATH" >&2
  exit 2
fi

# An empty YC_PROFILE makes yc 1.35.1 look up profile ''.
if [[ -z "${YC_PROFILE:-}" ]]; then
  unset YC_PROFILE || true
fi
export YC_PROFILE="$PROFILE"

if yc config profile create "$PROFILE"; then
  :
else
  yc config profile activate "$PROFILE"
fi

yc config set service-account-key "$KEY_FILE"
