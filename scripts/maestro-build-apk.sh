#!/usr/bin/env bash
# Build a standalone Android APK for Maestro E2E (preview offline or staging + optional local API).
#
# Uses `gradlew assembleRelease` (debug keystore) so Metro is not required.
# The debug Gradle task skips JS bundling (debuggableVariants=debug) and the
# nightly emulator then never reaches login — Maestro dies on `auth-register-link`.
#
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
    export EXPO_PUBLIC_AI_SCAN_ENABLED=true
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

# Release manifests do not set usesCleartextTraffic (debug overlays do).
# Staging Maestro talks HTTP to the host API at 10.0.2.2 — Android 9+ blocks
# that unless we allow cleartext for the emulator loopback domains only.
enable_emulator_http_cleartext() {
  local manifest="$ROOT/apps/mobile/android/app/src/main/AndroidManifest.xml"
  local xml_dir="$ROOT/apps/mobile/android/app/src/main/res/xml"
  mkdir -p "$xml_dir"
  cat >"$xml_dir/network_security_config.xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
    </domain-config>
</network-security-config>
EOF
  python3 - "$manifest" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
attr = 'android:networkSecurityConfig="@xml/network_security_config"'
if attr in text:
    print("networkSecurityConfig already set")
    raise SystemExit(0)
if "<application" not in text:
    raise SystemExit(f"no <application> in {path}")
text = text.replace("<application", f"<application {attr}", 1)
path.write_text(text)
print("Patched AndroidManifest networkSecurityConfig for Maestro staging HTTP")
PY
}

pnpm install --frozen-lockfile

cd apps/mobile
pnpm generate-assets || true
npx expo prebuild --platform android --no-install

if [ "$PROFILE" = "staging" ]; then
  enable_emulator_http_cleartext
fi

cd android
# Metro embeds EXPO_PUBLIC_* only when NODE_ENV=production (same as staging-apk-gradle.yml).
# Emulator in nightly is x86_64 — skip unused ABIs.
NODE_ENV=production ./gradlew assembleRelease --no-daemon -PreactNativeArchitectures=x86_64

APK="$PWD/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$APK" ]; then
  echo "ERROR: expected release APK at $APK" >&2
  exit 1
fi

if ! unzip -l "$APK" | grep -Eq 'index\.android\.bundle|index\.bundle'; then
  echo "ERROR: APK is missing the embedded JS bundle. Maestro cannot run without Metro." >&2
  unzip -l "$APK" | grep -Ei 'index|bundle|assets/' | head -40 >&2
  exit 1
fi

echo ""
echo "APK ready: $APK"
echo "Install: adb install -r $APK"
