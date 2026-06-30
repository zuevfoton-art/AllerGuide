# Maestro E2E — AllerGuide mobile

Smoke-тесты UI на **нативных** сборках (Android emulator / iOS simulator / физическое устройство). Web (`expo start --web`) Maestro не покрывает — только preview/staging APK/IPA.

**Профиль сборки для P2.1a:** EAS `preview` (`EXPO_PUBLIC_BACKEND_AUTH=false`, offline-first).

---

## Требования

| Инструмент | Версия |
|------------|--------|
| [Maestro CLI](https://maestro.mobile.dev/getting-started/installing-maestro) | ≥ 1.36 |
| Android emulator или iOS simulator | API 34+ / iOS 17+ |
| Preview APK/IPA | `pnpm --filter mobile build:preview:android` |

---

## Структура

```
apps/mobile/.maestro/
  config.yaml              # appId: com.allerguide.app
  scripts/random-phone.js  # уникальный телефон для регистрации
  flows/
    _offline-bootstrap.yaml   # register → onboarding → home (subflow)
    onboarding-smoke.yaml
    diary-smoke.yaml
    scanner-smoke.yaml
    sos-smoke.yaml
    settings-smoke.yaml
    smoke-all.yaml            # все 5 flows подряд
```

Селекторы стабильны по `testID` (локаль RU по умолчанию, но тексты в YAML минимальны).

---

## Локальный запуск

### 1. Собрать preview APK

```bash
pnpm --filter mobile build:preview:android
# Скачать APK из EAS Dashboard и установить на эмулятор:
adb install allerguide-preview.apk
```

Для dev-loop без EAS: `pnpm --filter mobile android` (debug build, тот же `appId`).

### 2. Запустить эмулятор

```bash
# Android
emulator -avd Pixel_7_API_34 &
adb wait-for-device
```

### 3. Maestro

Из корня монорепо:

```bash
pnpm --filter mobile maestro:test          # все 5 smoke flows
pnpm --filter mobile maestro:onboarding    # один flow
```

Или напрямую:

```bash
cd apps/mobile
maestro test .maestro/flows/smoke-all.yaml
maestro test .maestro/flows/diary-smoke.yaml
```

Полезные флаги:

- `--debug` — подробный лог
- `maestro studio` — интерактивная запись/отладка

---

## Покрытие P2.1a (offline)

| Flow | Сценарий |
|------|----------|
| `onboarding-smoke` | Регистрация → intro skip → профиль self + молоко → home |
| `diary-smoke` | Быстрая запись симптомов |
| `scanner-smoke` | Ручной ввод «молоко» → вердикт |
| `sos-smoke` | Карточка профиля, паспорт аллергика |
| `settings-smoke` | `/profile` — номер экстренной службы |

**Дальше (P2.1b):** staging flows auth + backup (`EXPO_PUBLIC_BACKEND_AUTH=true`).

**Дальше (P2.1c):** nightly CI `.github/workflows/maestro-nightly.yml`.

---

## testID (основные)

| ID | Экран |
|----|-------|
| `auth-*` | login / register |
| `onboarding-*` | intro, scenario |
| `profile-*` | profile-setup, /profile |
| `allergen-milk` | популярный аллерген |
| `tab-*` | нижняя навигация |
| `diary-quick-entry`, `diary-wizard-*` | дневник |
| `scanner-input`, `scanner-check`, `scanner-result` | сканер |
| `sos-profile-card`, `sos-passport-toggle` | SOS |
| `profile-header-button` | шестерёнка профиля на табах |

---

## Troubleshooting

| Симптом | Решение |
|---------|---------|
| `Unable to launch app` | Проверьте `appId` в `config.yaml` и установленный APK |
| Timeout на `auth-register-link` | Холодный старт — увеличьте `extendedWaitUntil` или перезапустите app |
| Scanner timeout | Offline match «молоко»; профиль должен содержать аллерген milk (bootstrap) |
| Diary wizard застрял | Убедитесь, что заполнены обязательные шаги (симптом + выраженность) |

См. также: [QA checklist § P2.1](./qa-checklist.md), [roadmap P2.1](./roadmap-to-prod.md).
