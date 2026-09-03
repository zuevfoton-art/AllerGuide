# Maestro E2E — AllerGuide mobile

Smoke-тесты UI на **нативных** сборках (Android emulator / iOS simulator / физическое устройство). Web (`expo start --web`) Maestro не покрывает.

| Профиль | EAS / сборка | API |
|---------|--------------|-----|
| **P2.1a offline** | `preview` — `EXPO_PUBLIC_BACKEND_AUTH=false` | не нужен |
| **P2.1b staging** | `staging` — auth + sync + fixture recovery key | `api.staging.allerguide.app` или локальный API |

---

## Требования

| Инструмент | Версия |
|------------|--------|
| [Maestro CLI](https://maestro.mobile.dev/getting-started/installing-maestro) | ≥ 1.36 |
| Android emulator | API 34+ |
| APK | preview или staging (см. ниже) |

---

## Структура

```
apps/mobile/.maestro/
  config.yaml
  scripts/
    random-phone.js
    staging-credentials.js
  flows/
    _offline-bootstrap.yaml
    _dismiss-ime.yaml              # tap auth-hero-title (не hideKeyboard/BACK)
    _tap-register.yaml             # Text testID + «Зарегистрироваться»
    onboarding-smoke.yaml … settings-smoke.yaml
    sos-no-profile-smoke.yaml      # SOS call bar after last profile is removed
    diary-dish-smoke.yaml          # §7.3 — борщ → checklist
    diary-photo-smoke.yaml         # §7.3 — skin photo step UI
    smoke-all.yaml                 # P2.1a — все offline
    _staging-bootstrap.yaml
    staging-auth-smoke.yaml        # P2.1b — logout → login
    staging-backup-smoke.yaml      # P2.1b — upload + recovery key
    staging-smoke-all.yaml         # P2.1b — оба staging flow
```

Селекторы по `testID` (локаль RU по умолчанию).

**Fixture recovery key (P2.1b):** в staging-сборке задаётся `EXPO_PUBLIC_MAESTRO_TEST_RECOVERY_KEY` (64 hex) — модалка показывает фиксированный ключ, Maestro отмечает «сохранил» и подтверждает. Только internal/staging, не production.

---

## Сборка APK для Maestro

```bash
# Offline (preview)
./scripts/maestro-build-apk.sh preview

# Staging (локальный API на хосте — эмулятор видит как 10.0.2.2:3001)
./scripts/maestro-start-api.sh   # Postgres + migrate + API :3001
MAESTRO_API_URL=http://10.0.2.2:3001 ./scripts/maestro-build-apk.sh staging

# assembleRelease (debug keystore) — JS bundle is embedded; assembleDebug needs Metro
adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

EAS: `pnpm --filter mobile build:preview:android` / `build:staging:android`.

---

## Локальный запуск

```bash
# P2.1a — offline
pnpm --filter mobile maestro:test

# P2.1b — staging (нужен API + staging APK)
pnpm --filter mobile maestro:staging
pnpm --filter mobile maestro:staging-auth
pnpm --filter mobile maestro:staging-backup
```

Прямой вызов:

```bash
cd apps/mobile
maestro test .maestro/flows/staging-smoke-all.yaml
```

---

## Покрытие

### P2.1a (offline)

| Flow | Сценарий |
|------|----------|
| `onboarding-smoke` | регистрация → профиль → home |
| `diary-smoke` | новая запись → симптомы |
| `scanner-smoke` | «молоко» → вердикт |
| `sos-smoke` | карточка + паспорт |
| `settings-smoke` | номер экстренной службы |

### P2.1b (staging)

| Flow | Сценарий |
|------|----------|
| `staging-auth-smoke` | email register (API) → logout → login |
| `staging-backup-smoke` | recovery key fixture → upload backup → alert «Готово» |

---

## Nightly CI (P2.1c)

Workflow [`.github/workflows/maestro-nightly.yml`](../.github/workflows/maestro-nightly.yml):

| Job | Runner | Что делает |
|-----|--------|------------|
| `maestro-offline` | `ubuntu-latest` + KVM | preview APK → `smoke-all.yaml` |
| `maestro-staging` | `ubuntu-latest` + KVM | Postgres + API → staging APK → `staging-smoke-all.yaml` |

Оба джоба: `arch: x86_64`, AVD `maestro-avd-34`, `emulator-boot-timeout: 900`, `MAESTRO_DRIVER_STARTUP_TIMEOUT=120000`, CLI pinned `MAESTRO_VERSION=2.8.0`, APK = `assembleRelease` (`app-release.apk`, JS вшит). Эмуляторный шаг — `scripts/maestro-run-emulator.sh` (pm grant + logcat). Offline больше не на `macos-latest` — Apple Silicon не даёт nested virtualization для x86_64 AVD.

Расписание: `0 3 * * *` (03:00 UTC). Если прогонов нет — workflow, скорее всего, **disabled** в Actions UI. Включить: **Actions → Maestro Nightly → Enable workflow** или `gh workflow enable maestro-nightly.yml`, затем **Run workflow**.

При падении — артефакты JUnit + `--debug-output` (`maestro-offline-report`, `maestro-staging-report`), плюс `*-during.png` / `*-during-focus.txt` (кадр до выхода Maestro), `*-screen.png` / `*-ui.xml`, `maestro-login-visible.png` и `~/.maestro/tests`. Опционально: настроить GitHub notifications / Slack webhook на failed workflow.

---

## testID (дополнение к P2.1a)

| ID | Экран |
|----|-------|
| `auth-login-input` | единое поле «Телефон или почта» |
| `cloud-backup-upload` / `cloud-backup-download` | облачный бэкап |
| `recovery-key-*` | модалка recovery key |
| `profile-logout` | выход из аккаунта |

---

## Troubleshooting

| Симптом | Решение |
|---------|---------|
| `auth-register-link` не виден (~45s) | Раньше: `assembleDebug` без Metro. Теперь: Pressable testID флапает — `_tap-register.yaml` ждёт Text `auth-register-link` и копию «Зарегистрироваться», пока герой ещё «Вход» |
| `auth-confirm-password-input` на экране «Вход» | `hideKeyboard` на Android = BACK. На корневом `/login` это выкидывает приложение в лаунчер, тап регистрации молча пропускается (`when:`). Лечится `_dismiss-ime.yaml` (тап `auth-hero-title`) |
| `auth-hero-title` не виден 120s + ANR Pixel Launcher | `has_anr_dialog` должен ловить `Application Not Responding` из dumpsys (не только `isn't responding`). Wait / Back, затем `ensure_app_foreground` |
| Post-fail скрин — app drawer | Maestro уже вышел. Смотреть `*-during.png` / `*-during-focus.txt` (кадр до выхода) |
| `onboarding-intro-skip` + баннер «непредвиденная ошибка» | Hermes: `@noble/hashes` кэширует `crypto` при импорте. Соль — `getSecureRandomBytes` + `setSecureRandomBytes` из `src/install-runtime` / expo-crypto |
| `allergen-milk` на шаге «Какая у тебя аллергия?» | Сначала `condition-food`, потом молоко. Общий `_complete-first-run-profile.yaml` |
| `onboarding-intro-skip` + «Не удалось подключиться к серверу» | Staging release APK блокирует cleartext HTTP на `10.0.2.2`. `maestro-build-apk.sh staging` пишет `network_security_config` |
| Staging register timeout | API доступен с эмулятора (`10.0.2.2:3001`); health `curl` на хосте |
| Backup upload timeout | `SYNC_ENABLED=true`, JWT после register; fixture key в APK |
| Offline scanner fail | профиль с allergen `milk` (bootstrap) |
| `scanner-input` не найден на «Сканер» | Поле спрятано за «Ввести вручную». Сначала `scanner-toggle-manual`, потом ввод. IME закрывать тапом `scanner-title`, не hideKeyboard |
| `onboarding-intro-skip` + «Введите корректный номер телефона» | `random-phone.js` даёт 10 национальных цифр без `+`. Android `input text` превращает `+` в пробел; маска LoginField тогда оставляет `(99` |
| `profile-logout` не виден на «Мои профили» | Кнопка ниже fold (бэкап/пыление). Сначала `profile-screen-title`, потом `scrollUntilVisible` |
| Форма регистрации заполнена, но онбординг не пришёл | Hermes без JIT: PBKDF2 600k блокирует JS ~40 c. `src/install-runtime` ставит `PASSWORD_HASH_ITERATIONS_INTERPRETED`; ожидание `onboarding-intro-skip` — 60 c |
| Кнопка «Подождите…» висит до таймаута (staging зелёный, offline красный) | Патч рантайма не попал в APK: Gradle берёт `index.js`, а не `package.json` `main`. Оба entry импортируют `src/install-runtime`. Staging хеширует на API, поэтому не падал |
| Тап регистрации «пропал», остались на «Вход» | ANR-диалог Pixel Launcher перехватил тап. `hide_error_dialogs 1` в `maestro-run-emulator.sh` |
| `diary-wizard-primary` не найден после ввода «зуд» | Gboard перекрывает «Далее» (в дампе bounds схлопнуты в ноль). `_dismiss-wizard-ime.yaml` тапает `diary-editor-title`, затем `_tap-wizard-primary.yaml` |
| `diary-wizard-step-label` не найден, IME открыта | Заголовок шага уехал под статус-бар: модалка применяла `liftStyle` и padding сразу. Шапка закреплена, тапаем `diary-editor-title` |
| `diary-wizard-primary` не появился после выбора раздела | `openSection` ждал pollen/AQI перед открытием визарда. Метаданные грузятся в фоне (`void loadAutoMetadata()`), запросы обогащения — через `fetchWithTimeout` |
| Нет пошаговых логов Maestro в артефактах | `~/.maestro/tests` в `upload-artifact` не раскрывается. Раннер копирует их в `maestro-*-maestro-logs` |
| Экран сбрасывается на корневой маршрут посреди сценария (напр. `diary-wizard-primary` исчез) | Сэмплер делал `am start` каждые 8 с: `dumpsys window` держит устаревшую строку `mCurrentFocus` лаунчера на втором дисплее. Передний план определяется по `topResumedActivity` (`scripts/lib/maestro-device.sh`, тест `scripts/maestro-device.test.mjs`) |
| `diary-chip-skin` не найден на «Записи в дневник» | Чипы типов убраны с домашнего экрана. `Новая запись` → `diary-picker-skin` в модалке «Что добавить» |

См. [QA checklist § P2.1](./qa-checklist.md), [phase-2-run](./phase-2-run.md).
