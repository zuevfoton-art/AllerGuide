# Локальная сборка Android через Node.js и проверка в Android Studio

Пошаговая инструкция, как собрать APK мобильного приложения **AllerGuide** на своём компьютере (без облака EAS), используя Node.js + Gradle, и проверить сборку в **Android Studio** на эмуляторе или физическом устройстве.

> Облачная сборка через EAS описана отдельно: [`docs/eas-internal-preview.md`](eas-internal-preview.md). Эта инструкция — про **локальную** сборку нативного Android-проекта (`apps/mobile/android/`).

---

## TL;DR

```bash
# 1. зависимости monorepo
pnpm install

# 2. перейти в мобильное приложение
cd apps/mobile

# 3. собрать и запустить debug на подключённом устройстве/эмуляторе (Node + Gradle)
pnpm android            # = expo run:android

# или собрать APK напрямую через Gradle
cd android && ./gradlew assembleDebug
# APK: apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Дальше — подробно, включая установку окружения и открытие проекта в Android Studio.

---

## 0. Что собираем

- `apps/mobile` — Expo / React Native приложение (managed-проект с уже сгенерированной нативной папкой `android/`).
- JS-движок: **Hermes**. Архитектура: классическая (New Architecture выключена).
- Версии в проекте: **Node 22.14.0**, **Gradle 8.13**, **Expo SDK 53 / React Native 0.79**, **JDK 17**.
- Package / applicationId: `com.allerguide.app`.

Backend не нужен — приложение offline-first, все основные сценарии работают без сети.

---

## 1. Установка окружения

### 1.1 Node.js и pnpm

Менеджер пакетов в репозитории — **pnpm** (через corepack).

```bash
# Node 22.x (рекомендуется nvm)
nvm install 22.14.0
nvm use 22.14.0

# pnpm через corepack (версия закреплена в package.json → packageManager)
corepack enable
corepack prepare pnpm@10.34.4 --activate

node --version    # v22.14.0
pnpm --version    # 10.34.4
```

### 1.2 JDK 17

Android Gradle Plugin для RN 0.79 требует **JDK 17**.

- Проще всего — поставить **JDK из комплекта Android Studio** (Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK → встроенный JBR 17).
- Либо отдельный Temurin/OpenJDK 17 и `JAVA_HOME` на него.

```bash
java -version    # должно быть 17.x
```

### 1.3 Android Studio + SDK

1. Установите **Android Studio** (https://developer.android.com/studio).
2. При первом запуске мастер (SDK Manager) поставит **Android SDK**. Проверьте, что установлены:
   - **SDK Platform** под целевой `compileSdk` (Android 15 / API 35) — открывается в SDK Manager → SDK Platforms;
   - **Android SDK Build-Tools**;
   - **Android SDK Platform-Tools** (даёт `adb`);
   - **Android SDK Command-line Tools (latest)**;
   - **Android Emulator** (если будете запускать на эмуляторе).
3. Пропишите переменные окружения, чтобы Gradle и Expo нашли SDK:

   **macOS / Linux** (`~/.zshrc` или `~/.bashrc`):
   ```bash
   export ANDROID_HOME="$HOME/Library/Android/sdk"   # Linux: $HOME/Android/Sdk
   export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin"
   ```

   **Windows** (PowerShell, переменные среды пользователя):
   ```powershell
   setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
   # добавьте в PATH: %ANDROID_HOME%\platform-tools, %ANDROID_HOME%\emulator
   ```

4. Примите лицензии SDK:
   ```bash
   yes | sdkmanager --licenses
   ```

Проверка:
```bash
adb --version
echo $ANDROID_HOME    # не должно быть пустым
```

---

## 2. Установка зависимостей проекта

Из **корня репозитория** (важно — это pnpm-monorepo):

```bash
pnpm install
```

`.npmrc` задаёт `node-linker=hoisted` — это нужно, чтобы нативные модули Expo корректно разрешались в pnpm-воркспейсе. Отдельно ставить зависимости внутри `apps/mobile` не нужно.

---

## 3. Подготовка устройства для проверки

Нужен либо эмулятор, либо физический телефон.

### Вариант A — эмулятор (Android Virtual Device)

1. Android Studio → **Device Manager** → **Create Device**.
2. Выберите телефон (например, Pixel 7), образ системы с API 35 (Google APIs), завершите мастер.
3. Запустите AVD (кнопка ▶). Проверьте:
   ```bash
   adb devices    # должен быть emulator-5554  device
   ```

### Вариант B — физическое устройство

1. На телефоне включите **Параметры разработчика** → **Отладка по USB**.
2. Подключите по USB, подтвердите запрос «Разрешить отладку».
3. Проверьте:
   ```bash
   adb devices    # ваш девайс со статусом device
   ```

---

## 4. Сборка и запуск через Node.js (Expo CLI)

Самый простой путь: Expo CLI сам соберёт нативный код через Gradle, поднимет Metro (Node-бандлер) и установит приложение на устройство/эмулятор.

Из `apps/mobile`:

```bash
cd apps/mobile

# debug-сборка + установка + запуск Metro
pnpm android          # эквивалент: npx expo run:android
```

Что происходит под капотом:
1. Expo генерирует/обновляет нативный проект и вызывает `./gradlew :app:assembleDebug` (Node участвует в бандлинге JS и автолинковке нативных модулей — см. вызовы `node --print` в `android/app/build.gradle`).
2. APK устанавливается через `adb install`.
3. Запускается **Metro** (dev-сервер на Node) — приложение подтягивает JS-бандл с компьютера.

Релизный вариант (минифицированный JS, встроенный бандл, без Metro):

```bash
pnpm android -- --variant release
# или прямой Gradle: см. раздел 5
```

> Первая сборка качает Gradle 8.13 и зависимости — это долго. Последующие сборки кешируются.

---

## 5. Сборка APK напрямую через Gradle

Если нужен именно файл `.apk` (например, чтобы отдать тестировщику), используйте Gradle-wrapper из нативной папки.

```bash
cd apps/mobile/android

# debug APK
./gradlew assembleDebug          # Windows: .\gradlew.bat assembleDebug

# release APK (подписан debug-ключом — только для внутренней проверки!)
./gradlew assembleRelease
```

Готовые файлы:

| Вариант | Путь |
|---------|------|
| debug | `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` |
| release | `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` |

Установить APK на подключённое устройство:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

> ⚠️ По умолчанию `release` подписан **debug-keystore** (`android/app/debug.keystore`) — это пригодно только для локальной проверки. Для публикации/раздачи генерируйте собственный keystore (см. https://reactnative.dev/docs/signed-apk-android) или собирайте через EAS.

### AAB для Google Play

```bash
./gradlew bundleRelease
# apps/mobile/android/app/build/outputs/bundle/release/app-release.aab
```

---

## 6. Проверка в Android Studio

1. **Откройте именно папку** `apps/mobile/android` (а не корень репозитория): Android Studio → **Open** → выберите `apps/mobile/android`.
2. Дождитесь **Gradle Sync** (внизу статус «Gradle sync finished»). При первом открытии IDE докачает зависимости.
3. Если IDE ругается на JDK — Settings → Build, Execution, Deployment → Build Tools → Gradle → **Gradle JDK** → выберите встроенный **jbr-17**.
4. Сверху выберите конфигурацию **app** и целевое устройство (эмулятор или подключённый телефон).
5. Нажмите **Run ▶** (Shift+F10) — Android Studio соберёт debug-вариант, установит и запустит приложение.
6. Сборка APK из меню: **Build → Build Bundle(s) / APK(s) → Build APK(s)**. По завершении появится ссылка **locate** на готовый `app-debug.apk`.
7. Логи рантайма — вкладка **Logcat** (фильтр по `com.allerguide.app`).

> Если запускаете dev-вариант (`Run ▶` без релиза), параллельно должен быть поднят Metro: `pnpm --filter mobile start` из корня (или `pnpm start` в `apps/mobile`). Release-вариант Metro не требует.

---

## 7. Smoke-проверка после установки

Минимальный прогон (полный — в [`docs/qa-checklist.md`](qa-checklist.md)):

1. Регистрация → onboarding → главная.
2. Создать запись в дневнике.
3. Открыть SOS.
4. Сканер (камера + штрихкод) — на физическом устройстве камера работает надёжнее, чем на эмуляторе.
5. Сменить язык на экране login/profiles.
6. Убить приложение и открыть заново — данные на месте (локальная SQLite).

---

## 8. Troubleshooting

| Проблема | Решение |
|----------|---------|
| `SDK location not found` / `ANDROID_HOME` пуст | Задайте `ANDROID_HOME` (раздел 1.3) или создайте `apps/mobile/android/local.properties` со строкой `sdk.dir=/путь/к/Android/sdk` |
| `Unsupported class file major version` / ошибки JDK | Используйте **JDK 17** (встроенный JBR из Android Studio) |
| `Unable to resolve "@allerguide/core"` | Запустите `pnpm install` из **корня**; не удаляйте `node-linker=hoisted` из `.npmrc` |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Удалите ранее установленное приложение с тем же package: `adb uninstall com.allerguide.app` |
| Долгая первая сборка / таймаут скачивания Gradle | Это нормально (качается Gradle 8.13 + зависимости); повторный запуск использует кеш |
| `adb: no devices/emulators found` | Запустите эмулятор или подключите телефон с включённой USB-отладкой; проверьте `adb devices` |
| Приложение зависает на splash в debug | Не поднят Metro — запустите `pnpm --filter mobile start`, либо собирайте `release` |
| Нужна чистая пересборка | `cd apps/mobile/android && ./gradlew clean` |
| Сбросить нативную папку с нуля | Из `apps/mobile`: `npx expo prebuild --platform android --clean` (перегенерирует `android/` из `app.json`) |

---

## Связанные файлы и документы

- [`apps/mobile/android/app/build.gradle`](../apps/mobile/android/app/build.gradle) — конфигурация Android-приложения (applicationId, signing, варианты)
- [`apps/mobile/android/gradle.properties`](../apps/mobile/android/gradle.properties) — Hermes, архитектуры ABI, память Gradle
- [`apps/mobile/app.json`](../apps/mobile/app.json) — package, версии, permissions, иконки
- [`docs/eas-internal-preview.md`](eas-internal-preview.md) — облачная сборка через EAS
- [`docs/qa-checklist.md`](qa-checklist.md) — полный регрессионный чеклист
