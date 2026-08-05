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

## Acceptance residual / launch crash

### 1.0.13 — `prebuild --clean`

Built with `expo prebuild --clean` and **did not launch**. Mitigation: **stop using `prebuild --clean`** for Gradle staging APKs; assemble from committed `apps/mobile/android/` and inject Maps key via `manifestPlaceholders` + `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.

### 1.0.14 — `@expo/dom-webview` SDK mismatch (confirmed via logcat)

```
java.lang.NoClassDefFoundError: Failed resolution of: Lexpo/modules/kotlin/types/AnyTypeCache;
  at expo.modules.webview.DomWebViewModule.definition(...)
```

Cause: optional peer `@expo/dom-webview: *` on `expo@55` resolved to **56.0.5**, which expects `AnyTypeCache` from `expo-modules-core` 56+. SDK 55 ships `expo-modules-core@55.0.25` without that class.

Fix: pin `@expo/dom-webview` to **55.0.6** (direct dep in `apps/mobile` + root `pnpm.overrides`).

### 1.0.15 — expo-router `No routes found`

Native modules loaded; JS crashed:

```
JavascriptException: Error: No routes found
  at ContextNavigator / ExpoRoot
```

Cause: Gradle `entryFile` was switched to `expo-router/entry` while `react.root` stays at the **workspace** root. Expo Router then looks for `app/` at the repo root (missing) instead of `apps/mobile/app`.

Fix: restore monorepo entry `apps/mobile/index.js` (`require.context('./app', …)`), which is what SDK 54 staging used successfully.

Fallback QA APK: `android-staging-1.0.11-*` (SDK 54 old-arch) until a post-fix SDK 55 APK passes smoke.

### 1.0.16+ — scanner camera frame at bottom

After launch worked, barcode camera UI sat low (absolute tab bar + overlay `space-between` with no shutter). Fix: fullscreen `Modal`, centered viewfinder, safe-area chrome (`apps/mobile/app/(tabs)/scanner.tsx`). Follow-up: Android shutter/gallery sat under 3-button nav because Modal `statusBarTranslucent` draws edge-to-edge while `insets.bottom` stays 0 — use `navigationBarTranslucent` + `resolveCameraChromePaddingBottom` floor (48dp) in `camera-chrome-metrics.ts`.

Keyboard: Android 15 / targetSdk 35 breaks `adjustResize` (IME covers diary editor + login password). Fix: `MainActivity` IME bottom inset (`withAndroidImeInsets` plugin), `Screen` Android scroll `paddingBottom` via `useKeyboardBottomInset`, `ModalKeyboardAvoid` / `useModalKeyboardAvoidance` for Modal TextInputs (diary, recovery key, allergen catalog, ASIT/prescribed OCR sheets), `tabBarHideOnKeyboard`.

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

**B. Workflow hardening (updated after 1.0.13 no-launch)**

- **Do not** run `expo prebuild --clean` for Gradle staging APKs — it wiped monorepo `android/` wiring and produced a non-launching 1.0.13 build.
- Assemble from committed `apps/mobile/android/` (`ExpoReactHostFactory`, monorepo `root`/`bundleConfig`).
- Entry must be `apps/mobile/index.js` (not `expo-router/entry`) while `react.root` is the workspace root.
- Maps key via `manifestPlaceholders` + `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` from CI.
- `NODE_ENV=production` for `assembleRelease`.

**C. If logcat shows a native abort in a specific package** — smallest bisect:

1. Temporarily exclude the culprit from Android autolinking (`react-native.config.js` `dependencies.<name>.platforms.android = null`) or gate the JS import.
2. Rebuild staging APK; retest cold start.
3. Pin/upgrade the package or keep it out of the critical path.

**D. Unblock QA without New Arch** — ship/use SDK 54 old-arch staging (`android-staging-1.0.11-*`) until New Arch cold start is green; do not merge SDK 55 until (1) is clean.

**E. Hygiene (optional, low risk):** `npx expo install expo-splash-screen expo-system-ui` so splash/`userInterfaceStyle` plugins resolve to SDK 55 packages.
