# Expo SDK 54 upgrade notes (Phase A)

## Stack

| | SDK 53 (before) | SDK 54 Phase A |
|--|-----------------|----------------|
| Expo | ~53 | ~54.0.36 |
| React Native | 0.79.6 | 0.81.5 |
| React | 19.0.0 | 19.1.0 |
| New Architecture | `false` | **`false`** (Phase B follow-up) |
| Gradle (bare) | 8.13 | 8.14.3 |
| `expo-modules-core` | 2.5.0 + patch | 3.0.30 + narrowed patch |

## Patch decision (audit)

| Fix | Upstream on SDK 54 | Action |
|-----|--------------------|--------|
| `LazyObject::unwrapObjectIfNecessary` null `backedObject` | Not landed as the same guard | **Kept** in `patches/expo-modules-core@3.0.30.patch` |
| `PromiseImpl` double-settle (Android 16 RECORD_AUDIO) | Still throws in production ([expo/expo#43094](https://github.com/expo/expo/issues/43094)) | **Kept** Promise hunk on 3.0.30 |

Drop the patch only after upstream lands both fixes and release APK cloud-mic is clean.

## API migrations in mobile services

- `expo-file-system` → `expo-file-system/legacy` for `cacheDirectory` / `documentDirectory` / `readAsStringAsync` (backup, diary photos, OCR, mic).
- `expo-speech-recognition` helpers → `ExpoSpeechRecognitionModule.*` (`isRecognitionAvailable`, `addListener`, services).
- `expo-audio` recorder → `AudioModule.AudioRecorder` (type-only `AudioRecorder` export).

## Voice / cloud-mic

- Staging EAS: `EXPO_PUBLIC_YC_STT_MIC=true` (with `EXPO_PUBLIC_YC_STT=true`).
- Preview/production leave mic flag unset (OS speech only) until device logcat confirms no SIGSEGV.
- Residual: this Cloud Agent environment has **no Android SDK**, so `assembleRelease` / device logcat could not be run here. Gradle wrapper is verified at **8.14.3**. Device acceptance: EAS `staging` APK + `adb logcat` around diary voice (OS + cloud-mic).

## Follow-ups (not in this PR)

- **Phase B:** `newArchEnabled=true` on SDK 54; smoke launch/diary/scanner/map/voice/SOS.
- **Phase C:** Expo 54 → 55 (RN 0.83 / React 19.2 / New Arch only) after Phase B is green.
