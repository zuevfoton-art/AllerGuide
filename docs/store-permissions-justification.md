# Store permission justifications (P3.5)

Draft review text from the strings already in [`apps/mobile/app.json`](../apps/mobile/app.json). Translate / legal-edit before store submission. Not submitted anywhere from this PR.

`eas.json` `submit.production.ios` still has placeholders (`ascAppId: 0000000000`, `appleTeamId: XXXXXXXXXX`). Real values are owner-supplied — this environment does not have them.

## Apple App Store (purpose strings)

| Permission | Current `infoPlist` / plugin string | Suggested review note |
|------------|-------------------------------------|------------------------|
| Camera (`NSCameraUsageDescription`) | «A-Claro использует камеру для сканирования штрихкодов продуктов.» | Used only on the Scanner tab to read product barcodes. No photos are uploaded unless the user starts a label/menu/dish scan. |
| Photo library (`NSPhotoLibraryUsageDescription`) | «A-Claro использует фото для загрузки меню и состава продуктов.» | User-initiated picker for menu / label / plate photos. No background access. |
| Location when in use (`NSLocationWhenInUseUsageDescription`) | «A-Claro использует геолокацию для показа аллерго-дружелюбных мест рядом.» | Map tab: nearby Places + pollen / air-quality around the user. Not used for tracking. Off when map flags are off. |
| Microphone (`NSMicrophoneUsageDescription`) | «A-Claro использует микрофон для голосового ввода в дневнике.» | Diary voice notes / on-device or optional YC STT. |
| Speech recognition (`NSSpeechRecognitionUsageDescription`) | «A-Claro распознаёт речь на устройстве, чтобы заполнять записи дневника.» | Same diary flow. Prefer on-device recognition; cloud STT only if `EXPO_PUBLIC_YC_STT_MIC` is on. |

Notifications: Expo plugin is present (`expo-notifications`) for clinical / diary reminders. Add an App Store note: “Optional reminders for medication and diary prompts. The user can deny the system dialog.”

## Google Play (permissions in `android.permissions`)

| Permission | Why |
|------------|-----|
| `CAMERA` | Barcode and document/plate scan on the Scanner tab |
| `ACCESS_COARSE_LOCATION` / `ACCESS_FINE_LOCATION` | Map: nearby POIs, pollen, air quality |
| `POST_NOTIFICATIONS` | Optional reminders |
| `RECORD_AUDIO` | Diary voice input |

Play Console declaration: these are foreground, user-initiated features. Location is not requested at startup; the Map tab triggers it. Camera is not requested until the user opens Scanner capture.

## English one-liners (if the store listing is EN)

- Camera: “Scan product barcodes and ingredient labels.”
- Photos: “Attach a menu, label, or plate photo for an allergy check.”
- Location: “Show nearby allergy-friendly places and local pollen / air quality.”
- Microphone: “Dictate a diary entry.”
- Notifications: “Optional medication and diary reminders.”

## Still needed from the owner

- [ ] Real `ascAppId` and `appleTeamId` for `eas.json` `submit.production.ios`
- [ ] Screenshots × 6 locales (P3.2)
- [ ] Age rating / medical-disclaimer store copy (P3.3)
- [ ] Confirm Android 13+ notification copy in Play Console
