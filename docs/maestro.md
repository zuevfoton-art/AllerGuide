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

При падении — артефакты JUnit + `--debug-output` (`maestro-offline-report`, `maestro-staging-report`), плюс `*-during.png` / `*-during-focus.txt` (кадр до выхода Maestro) и `*-screen.png` / `*-ui.xml`. Опционально: настроить GitHub notifications / Slack webhook на failed workflow.

---

## testID (дополнение к P2.1a)

| ID | Экран |
|----|-------|
| `auth-mode-email` / `auth-mode-phone` | переключатель login type |
| `cloud-backup-upload` / `cloud-backup-download` | облачный бэкап |
| `recovery-key-*` | модалка recovery key |
| `profile-logout` | выход из аккаунта |

---

## Troubleshooting

| Симптом | Решение |
|---------|---------|
| `auth-register-link` не виден (~45s) | Раньше: `assembleDebug` без Metro. Теперь: Pressable testID флапает — `_tap-register.yaml` ждёт Text `auth-register-link` и копию «Зарегистрироваться», пока герой ещё «Вход» |
| `auth-confirm-password-input` not found | Клавиатура перекрывает поле. Bootstrap скроллит и вызывает `hideKeyboard` (`_fill-by-id.yaml`) |
| `auth-hero-title` не виден 120s + ANR Pixel Launcher | Не греть через `monkey`. `am start -W -n com.aclearo.app/.MainActivity` и `dismiss_anr` (Wait / Back) |
| Post-fail скрин — app drawer | Maestro уже вышел. Смотреть `*-during.png` / `*-during-focus.txt` (кадр до выхода) |
| `auth-mode-phone` не виден 120s | Pressable-toggle флапает в Maestro. Ждать `auth-hero-title`. Артефакты: `*-screen.png`, `*-during.png`, `*-logcat.txt` |
| Staging register timeout | API доступен с эмулятора (`10.0.2.2:3001`); health `curl` на хосте |
| Backup upload timeout | `SYNC_ENABLED=true`, JWT после register; fixture key в APK |
| Offline scanner fail | профиль с allergen `milk` (bootstrap) |

См. [QA checklist § P2.1](./qa-checklist.md), [phase-2-run](./phase-2-run.md).
