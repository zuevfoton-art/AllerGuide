# EAS Preview — первая internal-сборка

**Roadmap:** [P0.4](roadmap-to-prod.md#phase-0--stabilization-mvp--internal-alpha)  
**Профиль:** `preview` в [`apps/mobile/eas.json`](../apps/mobile/eas.json)

Internal alpha-сборка для TestFlight (iOS) и прямой установки APK (Android). Backend feature flags **выключены** — приложение работает offline-first, как в локальной разработке.

> Нужна **локальная** сборка Android (Node.js + Gradle) и проверка в Android Studio без облака? См. [`docs/android-local-build.md`](android-local-build.md).

---

## Что даёт preview

| Платформа | Распространение | Формат |
|-----------|-----------------|--------|
| iOS | TestFlight / internal | `.ipa` на устройство |
| Android | Прямая ссылка / internal track | `.apk` |

После сборки прогоните [`docs/qa-checklist.md`](qa-checklist.md) на **3+ физических устройствах**.

---

## Быстрый старт (Windows)

Из корня репозитория (после `git pull`):

```powershell
pnpm install
.\scripts\first-preview-build.ps1
```

Скрипт: `eas login` → `eas init` (если projectId ещё placeholder) → `pnpm build:preview:android`.

Только iOS:

```powershell
.\scripts\first-preview-build.ps1 -Platform ios
```

Вручную (без скрипта):

```powershell
cd apps\mobile
pnpm install
pnpm exec eas login
pnpm exec eas init
pnpm build:preview:android
```

---

### Аккаунты

1. [Expo account](https://expo.dev/signup)
2. **Apple Developer** ($99/год) — для iOS TestFlight
3. **Google Play Console** ($25 разово) — для Android internal testing (APK можно раздавать и без Play, по прямой ссылке EAS)

### Инструменты

```bash
pnpm install   # eas-cli уже в devDependencies apps/mobile
pnpm exec eas --version
```

---

## Одноразовая настройка проекта

Выполните из корня monorepo:

```bash
cd apps/mobile
eas login
eas init                 # создаёт проект на expo.dev, пропишет projectId
```

`eas init` обновит `app.json` → `extra.eas.projectId`. **Закоммитьте** реальный UUID в репозиторий (замените placeholder `00000000-0000-0000-0000-000000000000`).

### Apple (iOS)

```bash
eas credentials --platform ios
```

EAS может автоматически создать Distribution Certificate и Provisioning Profile. Для TestFlight нужен App Store Connect app record с bundle ID `com.allerguide.app`.

### Android

```bash
eas credentials --platform android
```

EAS создаст keystore. Сохраните backup keystore — без него нельзя обновлять приложение в Play.

---

## Сборка preview

Из `apps/mobile`:

```bash
# Обе платформы
pnpm build:preview

# Только Android (APK, быстрее для первого smoke)
pnpm build:preview:android

# Только iOS (TestFlight)
pnpm build:preview:ios
```

Эквивалент без npm-скриптов:

```bash
eas build --profile preview --platform android
eas build --profile preview --platform ios
eas build --profile preview --platform all
```

### Переменные окружения preview

Профиль `preview` в `eas.json` явно задаёт:

| Переменная | Значение |
|------------|----------|
| `EXPO_PUBLIC_BACKEND_AUTH` | `false` |
| `EXPO_PUBLIC_CLOUD_SYNC` | `false` |
| `EXPO_PUBLIC_AI_SCAN_ENABLED` | `false` |
| `EXPO_PUBLIC_PRODUCT_DB` | `false` |
| `EXPO_PUBLIC_ANALYTICS_ENABLED` | `false` |

Sentry и analytics остаются выключенными (DSN пустой).

---

## Распространение тестировщикам

### Android

1. После сборки откройте [expo.dev](https://expo.dev) → проект → Builds
2. Скачайте `.apk` или поделитесь QR / ссылкой
3. На устройстве: разрешите установку из неизвестных источников

### iOS

1. `eas submit --platform ios --profile preview` **или** загрузите `.ipa` в App Store Connect вручную
2. App Store Connect → TestFlight → Internal Testing
3. Добавьте тестировщиков (до 100 internal)

Для самого первого smoke достаточно 1–2 internal tester + ваше устройство.

---

## Проверка сборки

Минимальный smoke после установки:

1. Регистрация → onboarding → главная
2. Создать запись в дневнике
3. Открыть SOS
4. Сканер (камера + штрихкод)
5. Сменить язык на login/profiles
6. Kill app → reopen (данные на месте)

Полный прогон: [`docs/qa-checklist.md`](qa-checklist.md).

---

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| `Invalid UUID appId` | Запустите `eas init`, закоммитьте `projectId` |
| iOS: No profiles for bundle ID | Создайте app в App Store Connect с `com.allerguide.app` |
| Android: INSTALL_FAILED | Удалите старую debug-сборку с тем же package |
| Build fails on monorepo | Запускайте из `apps/mobile`; EAS определяет root автоматически |
| `pnpm add pnpm@10.34.4` exit code 1 | Не пиньте `"pnpm"` в `eas.json` — используйте `packageManager` в корневом `package.json` + `.npmrc` с `node-linker=hoisted` |
| Expo SDK warnings | Ожидаемы на Expo 53; не блокируют preview |

---

## Следующие шаги (после preview)

1. Зафиксировать баги из QA → GitHub issues (`phase-0`)
2. [P0.2] Закрыть P0/P1 баги
3. [P0.5] Локализация legal
4. [Phase 1] Staging API + backend flags

---

## Связанные файлы

- [`apps/mobile/eas.json`](../apps/mobile/eas.json) — профили сборки
- [`apps/mobile/app.json`](../apps/mobile/app.json) — bundle ID, permissions, icons
- [`docs/qa-checklist.md`](qa-checklist.md) — регрессионный чеклист
