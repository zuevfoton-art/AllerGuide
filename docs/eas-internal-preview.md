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

EAS может автоматически создать Distribution Certificate и Provisioning Profile. Для TestFlight нужен App Store Connect app record с bundle ID `com.aclearo.app`.

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

## Нативные ограничения сборки (важно для Android)

Эти настройки обязательны для стабильного запуска APK — не возвращайте их назад без проверки на физическом устройстве:

| Настройка | Значение | Почему |
|-----------|----------|--------|
| New Architecture (SDK 55+) | **всегда on** | `newArchEnabled` убран из `app.json`. Legacy Architecture недоступна. Откат на SDK 54 old-arch только через downgrade. |
| `react-native-quick-crypto` | **не используется** | Его нативный `install()` аварийно завершал процесс **при запуске** на Android (native/JNI abort, который JS `try/catch` не ловит). Полностью удалён. |
| Криптография (хэш паролей, PBKDF2/SHA-256) | **чистый JS `@noble/hashes`** в `@allerguide/core` (`src/password.ts`) | Не грузит нативный крипто-модуль на старте; формат хэшей не изменился (старые хэши проверяются). |
| Стоимость PBKDF2 на native | `PASSWORD_HASH_ITERATIONS_INTERPRETED` (50k) вместо 600k, ставится из `src/install-runtime` | Hermes — интерпретатор без JIT: 600k итераций блокируют JS-поток ~40 c, регистрация и вход «зависают». Web и API остаются на 600k. |
| Соль для хэша | `setSecureRandomBytes` (expo-crypto) из `src/install-runtime` | `@noble/hashes` кэширует `globalThis.crypto` при импорте, а в release-сборке Hermes его нет. |
| Точка входа JS | `index.js` (Gradle `entryFile`) **и** `entry.js` (`package.json` `main` для Expo CLI/EAS/web) импортируют `src/install-runtime` | Патч только в `entry.js` не попадает в нативный release-бандл — Gradle его не читает. |
| Резервное шифрование (AES-GCM) | Web Crypto, с мягкой деградацией | На нативе `crypto.subtle` отсутствует → `isEncryptionAvailable() === false`, облачный бэкап (по умолчанию выключен) просто не шифруется. |

**История крашей запуска (для контекста):**
- 1.0.0 / 1.0.1 — краш из-за `react-native-quick-crypto` `install()` на старте (New Arch). JS-guard в 1.0.1 не помог (нативный abort).
- 1.0.2 / 1.0.3 — отключение New Architecture не помогло (нативный модуль грузился всё равно).
- **1.0.4 — `react-native-quick-crypto` удалён, крипто переведено на pure-JS `@noble/hashes`** → нативный крипто-модуль на старте не загружается.

Если снова появится краш на запуске, нужен `adb logcat *:E` с устройства в момент старта — ErrorBoundary показывает текст JS-ошибки, но нативный abort виден только в logcat.

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
| iOS: No profiles for bundle ID | Создайте app в App Store Connect с `com.aclearo.app` |
| Android: INSTALL_FAILED | Удалите старую debug-сборку с тем же package |
| Android: краш сразу при запуске | Не подключайте `react-native-quick-crypto` и не включайте `newArchEnabled` без проверки на устройстве (см. «Нативные ограничения сборки»). Соберите свежий APK и снимите `adb logcat *:E`. |
| Build fails on monorepo | Запускайте из `apps/mobile`; EAS определяет root автоматически |
| `pnpm add pnpm@10.34.4` exit code 1 | Не пиньте `"pnpm"` в `eas.json` — используйте `packageManager` в корневом `package.json` + `.npmrc` с `node-linker=hoisted` |
| Expo SDK warnings | Ожидаемы на Expo 55; не блокируют preview |
| Cloud mic SIGSEGV (release) | Staging включает `EXPO_PUBLIC_YC_STT_MIC` после SDK 54 + `expo-modules-core@3.0.30` patch. Если logcat снова показывает crash в `libexpo-modules-core.so` — выключите флаг и см. [`docs/expo-sdk-54-upgrade-notes.md`](expo-sdk-54-upgrade-notes.md) |

---

## Следующие шаги (после preview)

1. Зафиксировать баги из QA → GitHub issues (`phase-0`)
2. [P0.2] Закрыть P0/P1 баги
3. [P0.5] Локализация legal
4. [Phase 1] Staging API + [`eas-staging-build.md`](eas-staging-build.md)

---

## Связанные файлы

- [`apps/mobile/eas.json`](../apps/mobile/eas.json) — профили сборки
- [`apps/mobile/app.json`](../apps/mobile/app.json) — bundle ID, permissions, icons
- [`docs/qa-checklist.md`](qa-checklist.md) — регрессионный чеклист
