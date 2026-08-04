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
