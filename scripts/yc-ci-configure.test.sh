#!/usr/bin/env bash
# Mock-yc unit check for scripts/yc-ci-configure.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

CALLS="$TMP/calls.log"
KEY="$TMP/sa-key.json"
echo '{"id":"test"}' > "$KEY"

cat > "$TMP/yc" << 'EOF'
#!/bin/sh
echo "$*" >> "$CALLS"
cmd="$1 $2 ${3:-}"
case "$cmd" in
  "config profile create"*)
    if [ -f "$EXISTING" ]; then
      echo "profile already exists" >&2
      exit 1
    fi
    echo "Profile '${4:-}' created and activated"
    exit 0
    ;;
  "config profile activate"*)
    echo "Profile '${4:-}' activated"
    exit 0
    ;;
  "config set service-account-key"*)
    echo "set key $4"
    exit 0
    ;;
  *)
    echo "unexpected yc invocation: $*" >&2
    exit 1
    ;;
esac
EOF
chmod +x "$TMP/yc"

export PATH="$TMP:$PATH"
export CALLS EXISTING="$TMP/no-such"

"$ROOT/scripts/yc-ci-configure.sh" "$KEY"
mapfile -t LINES < "$CALLS"
test "${LINES[0]}" = "config profile create github"
test "${LINES[1]}" = "config set service-account-key $KEY"

: > "$CALLS"
touch "$TMP/exists"
export EXISTING="$TMP/exists"
"$ROOT/scripts/yc-ci-configure.sh" "$KEY"
mapfile -t LINES < "$CALLS"
test "${LINES[0]}" = "config profile create github"
test "${LINES[1]}" = "config profile activate github"
test "${LINES[2]}" = "config set service-account-key $KEY"

if "$ROOT/scripts/yc-ci-configure.sh" >/dev/null 2>&1; then
  echo "expected usage error without key path" >&2
  exit 1
fi

echo "yc-ci-configure.sh ok"
