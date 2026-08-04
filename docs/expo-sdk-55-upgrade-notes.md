# Expo SDK 55 upgrade notes (Phase C)

Stacked on Phase A (SDK 54 old-arch) + Phase B (New Arch on 54).

## Stack

| | SDK 54 Phase B | SDK 55 Phase C |
|--|----------------|----------------|
| Expo | ~54.0.36 | ~55.0.28 |
| React Native | 0.81.5 | 0.83.10 |
| React | 19.1.0 | 19.2.0 |
| Architecture | New Arch on | **New Arch only** (Legacy removed) |
| Gradle (bare) | 8.14.3 | 9.0.0 |
| `expo-modules-core` | 3.0.30 + patch | **55.0.25** + patch |

## Config

- Removed `newArchEnabled` from `app.json` (ignored / removed from schema on SDK 55).
- Android `gradle.properties` keeps `newArchEnabled=true` for tooling that still reads it.
- iOS `Podfile.properties.json` no longer sets `newArchEnabled`.
- Hermes v1 **not** enabled (`expo.useHermesV1` unset).

## Patch

`patches/expo-modules-core@55.0.25.patch` keeps:

1. Promise double-settle no-throw (Android 16 RECORD_AUDIO; [expo#43094](https://github.com/expo/expo/issues/43094))
2. LazyObject null `backedObject` guard (cloud-mic / audio JSI)

Drop when upstream lands both.

## Native helper 54→55

- `MainApplication` → `ExpoReactHostFactory.getDefaultReactHost`
- `hermesCommand` → `hermes-compiler` package path
- Storage permissions `maxSdkVersion=32`
- Activity `smallestScreenSize` in `configChanges`
- Gradle wrapper **9.0.0**
- iOS `AppDelegate`: `@main` + `internal import Expo`; drop `bindReactNativeFactory`
- Podfile: drop Legacy Arch env toggles; optional Hermes v1 flag

## Acceptance residual

Cloud Agent has no Android SDK — device smoke (cold start, diary+voice, scanner, map, SOS, sqlite) must run on EAS staging APK after merge.

## Staging APK launch investigation (Gradle CI)

Context: tag `android-staging-1.0.13-sdk55-*` builds via [`.github/workflows/staging-apk-gradle.yml`](../.github/workflows/staging-apk-gradle.yml) (`npx expo prebuild --platform android --clean` → `assembleRelease`) and does not launch on device. Last known-good Gradle staging APK was `android-staging-1.0.11-*` (**old architecture**, `newArchEnabled=false`). Phase B New Arch APK (`1.0.12-newarch`) was cancelled before device smoke.

### Facts (verified in repo + APK forensics)

| Check | Result |
|-------|--------|
| Committed `MainApplication.kt` vs `expo-template-bare-minimum@sdk-55` | **Identical** (package name aside): both use `ExpoReactHostFactory.getDefaultReactHost` + `loadReactNative` |
| `prebuild --clean` wipes ExpoReactHostFactory? | **No** — template regenerates the same host setup |
| Google Maps after `--clean` | Survives when `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is set during prebuild: Expo `withGoogleMapsApiKey` writes a **literal** `com.google.android.geo.API_KEY` (not `${GOOGLE_MAPS_API_KEY}`). CI has a valid `AIza…` secret. |
| Committed monorepo Gradle hacks (`root=workspaceRoot`, forced `index.js`, `bundleConfig`) | **Wiped** by `--clean`. SDK 54 CI used the same wipe and still launched → not sufficient alone to explain a new SDK 55 crash |
| Hermes / New Arch in SDK 55 APK | Bundle present (~4.6 MB Hermes bytecode, magic `c61fbc03`); contains `api.staging.aclearo.com`. Native: `libhermesvm.so` + `libappmodules.so` + Fabric codegen (`rnscreens`/`rnsvg`/`safeareacontext`). Old-arch 1.0.11 had `libhermes.so` and **no** `libappmodules.so` |
| JS entry / ErrorBoundary | `package.json` `main` → `expo-router/entry` (what CI resolves). Custom `index.js` is unused by post-prebuild Gradle. `_layout` gates on `initDb` with try/catch; ErrorBoundary cannot catch native/JNI aborts |
| Plugins | No Sentry plugin in Gradle workflow (`SENTRY_ORG` unset). Splash configured in `app.json` but **`expo-splash-screen` / `expo-system-ui` not installed** (prebuild warns about system-ui). `edgeToEdgeEnabled` flips to template `true` after `--clean` (SDK 55: edge-to-edge customization deprecated / Android 16 mandatory) |
| CI assemble | Succeeds; warns `NODE_ENV` unset during bundle (workflow now sets `NODE_ENV=production`) |

### Root-cause hypotheses (ranked)

1. **Highest — New Architecture–only native abort at process start (SDK 55 / RN 0.83)**  
   First staging APK that must run New Arch (`DefaultNewArchitectureEntryPoint.load()` → `libappmodules.so`). Last good APK was old-arch. Historical launch crashes were native (`react-native-quick-crypto`); that package is gone, but another autolinked Fabric/JSI module may abort before JS ErrorBoundary runs. Suspects to bisect with logcat: `react-native-maps` (Fabric descriptors in `libappmodules`), `@sentry/react-native` (still linked), `expo-audio` / `expo-speech-recognition`, `expo-modules-core`.  
   **Confirm:** `adb logcat *:E` around cold start — look for `SoLoader`, `appmodules`, `libexpo-modules-core`, `rnmaps`, `RNSentry`, `HermesVM`.

2. **High — New Arch never device-validated on this app before Phase C**  
   Phase B checklist required cold-start smoke; `1.0.12-newarch` was cancelled. SDK 55 cannot disable Legacy Arch — if New Arch is broken for a dependency, the only rollback is SDK 54 old-arch.

3. **Medium — post-`--clean` native/config drift (edge-to-edge / splash / missing splash package)**  
   Unlikely to cause instant process death alone; still worth aligning (`npx expo install expo-splash-screen expo-system-ui`) so splash/system UI match SDK 55 expectations.

4. **Low — Google Maps key / maps Android setup lost**  
   Disproven for CI when secret is valid: prebuild injects literal API key + `org.apache.http.legacy`. Missing key would break the map screen, not Application `onCreate`.

5. **Low / disproven — ExpoReactHostFactory wiped by `--clean`**  
   Template and committed files match; CI regenerates the correct host.

6. **Low — JS startup / ErrorBoundary gap**  
   Bundle embeds staging URL and `expo-router`. A pure JS throw after React mount would show ErrorBoundary, not a silent “won’t launch” (unless the failure is a fatal Hermes/native exception during module init).

### Minimal fix path (launchable release APK)

**A. Confirm with logcat (required)** on a device/emulator with the 1.0.13 APK:

```bash
adb logcat -c && adb shell am start -n com.aclearo.app/.MainActivity && adb logcat *:E
```

**B. Workflow / prebuild hardening (landed on this branch)**

- Keep `prebuild --clean` (correct SDK 55 template).
- Re-apply monorepo `bundleConfig → metro.config.js` via `apps/mobile/plugins/withAndroidMonorepoGradle.js`.
- CI verify step asserts `ExpoReactHostFactory` + `bundleConfig` + literal Maps meta-data.
- Set `NODE_ENV=production` for `assembleRelease`.

**C. If logcat shows a native abort in a specific package** — smallest bisect:

1. Temporarily exclude the culprit from Android autolinking (`react-native.config.js` `dependencies.<name>.platforms.android = null`) or gate the JS import.
2. Rebuild staging APK; retest cold start.
3. Pin/upgrade the package or keep it out of the critical path.

**D. Unblock QA without New Arch** — ship/use SDK 54 old-arch staging (`android-staging-1.0.11-*`) until New Arch cold start is green; do not merge SDK 55 until (1) is clean.

**E. Hygiene (optional, low risk):** `npx expo install expo-splash-screen expo-system-ui` so splash/`userInterfaceStyle` plugins resolve to SDK 55 packages.
