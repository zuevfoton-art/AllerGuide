#!/usr/bin/env bash
# Local preview APK build (Android). Requires Android SDK (ANDROID_HOME) and JDK 21.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -z "${ANDROID_HOME:-}" ]; then
  echo "ANDROID_HOME is not set. Install Android SDK (platform 35, build-tools 35, NDK 27)."
  exit 1
fi

pnpm install

cd apps/mobile
npx expo install --fix
npx expo prebuild --platform android --clean --no-install

cd android
./gradlew assembleRelease --no-daemon

APK="$PWD/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "APK ready: $APK"
echo "Package: com.aclearo.com | Signed with debug keystore (testing only)"
