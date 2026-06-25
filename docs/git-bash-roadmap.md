# Roadmap и GitHub issues через Git Bash (Windows)

Пошаговая инструкция для **Git Bash** на Windows: от клонирования репозитория до создания milestones/issues Phase 1–2 и работы по задачам.

**Связанные документы:**

- [roadmap-to-prod.md](./roadmap-to-prod.md) — фазы P0–P5
- [phase1-phase2-issues.md](./phase1-phase2-issues.md) — 45 подзадач с зависимостями
- [eas-internal-preview.md](./eas-internal-preview.md) — EAS-сборки (есть и PowerShell-скрипт)

---

## 1. Что понадобится

| Инструмент | Зачем | Установка |
|------------|-------|-----------|
| **Git for Windows** | Git Bash | https://git-scm.com/download/win |
| **Node.js 20+** | pnpm, скрипты | https://nodejs.org/ (LTS) |
| **pnpm 10** | monorepo | `corepack enable` (см. ниже) |
| **GitHub CLI (`gh`)** | создание issues | https://cli.github.com/ |
| **jq** | парсинг JSON в скриптах | `winget install jqlang.jq` или Chocolatey |

Проверка в **Git Bash**:

```bash
git --version
node --version    # v20.x или v22.x
pnpm --version    # 10.34.x
gh --version
jq --version
```

Если `pnpm` не найден:

```bash
corepack enable
corepack prepare pnpm@10.34.4 --activate
```

---

## 2. Вход в GitHub CLI

Один раз авторизуйтесь (нужны права `issues:write` на репозиторий):

```bash
gh auth login
```

Рекомендуемые ответы мастера:

1. **GitHub.com**
2. **HTTPS**
3. **Login with a web browser** (или token)
4. Подтвердить доступ в браузере

Проверка:

```bash
gh auth status
gh repo view zuevfoton-art/AllerGuide
```

---

## 3. Клонирование и обновление репозитория

### Первый раз

```bash
cd ~/projects   # или любая папка без пробелов в пути
git clone https://github.com/zuevfoton-art/AllerGuide.git
cd AllerGuide
```

### Обновление (каждый раз перед работой)

```bash
cd ~/projects/AllerGuide
git fetch origin
git checkout main
git pull origin main
```

Если работаете с веткой агента/PR:

```bash
git fetch origin
git checkout cursor/phase1-phase2-issues-594f
git pull origin cursor/phase1-phase2-issues-594f
```

---

## 4. Настройка Git Bash для shell-скриптов (важно на Windows)

Скрипты `*.sh` должны иметь Unix-переводы строк (LF). Иначе ошибка `bash\r: No such file or directory`.

```bash
cd ~/projects/AllerGuide

# Не конвертировать .sh в CRLF при checkout
git config core.autocrlf input

# Для этого репозитория — всегда LF для shell-скриптов
git config core.eol lf
```

Если скрипт уже «сломался»:

```bash
sed -i 's/\r$//' scripts/create-roadmap-issues.sh
sed -i 's/\r$//' scripts/create-phase-issues.sh
chmod +x scripts/create-roadmap-issues.sh
chmod +x scripts/create-phase-issues.sh
```

Установка зависимостей monorepo:

```bash
pnpm install
```

---

## 5. Создание milestones и родительских issues (P0–P5)

Скрипт читает [`scripts/roadmap-issues.json`](../scripts/roadmap-issues.json) и создаёт **6 milestones + 34 issues** (`[P0.1]` … `[P5.6]`).

### Шаг 5.1 — предпросмотр

```bash
cd ~/projects/AllerGuide
./scripts/create-roadmap-issues.sh --dry-run
```

Вы увидите список `[dry-run] issue P1.1: ...` без записи в GitHub.

### Шаг 5.2 — только labels (опционально)

```bash
./scripts/create-roadmap-issues.sh --labels-only
```

### Шаг 5.3 — создание

```bash
./scripts/create-roadmap-issues.sh
```

Ожидаемый вывод:

```text
=== Creating milestones ===
  created: Phase 1: Backend integration (#2)
...
=== Creating issues ===
  created: [P1.1] Deploy API на staging
  skip (exists #NN): ...    ← при повторном запуске
=== Summary ===
Created: N issues, skipped: M
```

Скрипт **идемпотентен**: повторный запуск пропускает issues, у которых в заголовке уже есть `[P1.1]` и т.д.

### Проверка в браузере

```bash
gh issue list --label roadmap --limit 10
start https://github.com/zuevfoton-art/AllerGuide/milestones
```

(`start` откроет браузер в Git Bash на Windows.)

---

## 6. Создание детальных подзадач Phase 1–2 (45 issues)

После родительских задач — подзадачи с зависимостями из [`scripts/phase1-phase2-issues.json`](../scripts/phase1-phase2-issues.json).

### Шаг 6.1 — предпросмотр

```bash
./scripts/create-phase-issues.sh --dry-run
```

В конце:

```text
Dry run: 45 issues, ~59.5 person-days total.
```

### Шаг 6.2 — создание

```bash
./scripts/create-phase-issues.sh
```

Каждый issue получит в теле таблицу: **ID, родитель, роль, оценка (дн.), зависит от, блокирует**.

### Шаг 6.3 — фильтр в GitHub

```bash
gh issue list --label phase-1 --limit 20
gh issue list --search "[P1.1a]" --limit 5
```

Или в браузере:

```text
https://github.com/zuevfoton-art/AllerGuide/issues?q=label%3Aphase-1
```

---

## 7. Работа по задаче (ветка → код → PR)

Пример: взять задачу **P1.2d** (Profile dual-write).

### Шаг 7.1 — найти issue

```bash
gh issue list --search "[P1.2d]" --json number,title,url
```

Запомните номер issue, например `#78`.

### Шаг 7.2 — создать ветку

Имена веток в cloud-агенте: `cursor/<описание>-594f`. Локально можно короче:

```bash
git checkout main
git pull origin main
git checkout -b feature/p1-2d-profile-dual-write
```

### Шаг 7.3 — реализация и проверки

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm --filter mobile lint
```

### Шаг 7.4 — commit

```bash
git add apps/mobile/src/services/profile-service.ts
git status
git commit -m "feat(mobile): profile dual-write to staging API (P1.2d)"
```

Формат коммитов: [Conventional Commits](https://www.conventionalcommits.org/) (см. `development-rules.md`).

### Шаг 7.5 — push

```bash
git push -u origin feature/p1-2d-profile-dual-write
```

### Шаг 7.6 — Pull Request

```bash
gh pr create \
  --title "feat(mobile): profile dual-write (P1.2d)" \
  --body "Closes #78

## Summary
- Dual-write create/update/delete profiles to staging API
- Offline-first preserved per ADR P1.2a

## Checks
- [x] pnpm typecheck
- [x] pnpm test" \
  --base main
```

Закрытие issue при merge: в теле PR указать `Closes #78` или `Fixes #78`.

### Шаг 7.7 — связать PR с roadmap issue вручную

В GitHub UI: Development → Link issue, или в комментарии к issue вставить ссылку на PR.

---

## 8. Порядок выполнения Phase 1 (по зависимостям)

Не начинайте задачу, пока не закрыты зависимости из таблицы в issue.

```bash
# Критический путь — минимальная цепочка
# P1.1a → P1.1b → P1.1c → P1.2b → P1.2c → P1.2d → P1.4a → P1.4b → P1.4c → P1.7
```

Проверить, какие подзадачи ещё открыты:

```bash
gh issue list --label phase-1 --state open --json number,title --jq '.[] | "\(.number)\t\(.title)"'
```

Отметить задачу выполненной:

```bash
gh issue close 78 --comment "Merged in PR #99"
```

---

## 9. Типичные ошибки в Git Bash

| Ошибка | Причина | Решение |
|--------|---------|---------|
| `bash\r: No such file or directory` | CRLF в `.sh` | `sed -i 's/\r$//' scripts/....sh` |
| `gh: command not found` | gh не в PATH | Переустановить gh, перезапустить Git Bash |
| `jq: command not found` | jq не установлен | `winget install jqlang.jq` |
| `Error: GitHub CLI (gh) is required` | gh не установлен | см. выше |
| `failed to create milestone` | нет прав | `gh auth refresh -s repo` |
| `pnpm: command not found` | corepack off | `corepack enable` |
| Permission denied на `.sh` | нет +x | `chmod +x scripts/*.sh` |
| Путь с пробелами | `C:\Users\Me\My Projects\` | Клонировать в путь без пробелов |

---

## 10. Полезные команды Git Bash

```bash
# Статус и ветки
git status
git branch -a
git log --oneline -5

# Отменить локальные изменения в файле
git checkout -- path/to/file

# Обновить ветку от main
git fetch origin
git rebase origin/main

# Список открытых roadmap-задач Phase 1
gh issue list --milestone "Phase 1: Backend integration" --state open

# Экспорт списка issues в файл
gh issue list --label phase-1 --limit 100 --json number,title,state > /tmp/phase1-issues.json
```

---

## 11. Чеклист «с нуля за один сеанс»

```bash
# 1. Инструменты
gh auth login
corepack enable

# 2. Репозиторий
cd ~/projects
git clone https://github.com/zuevfoton-art/AllerGuide.git
cd AllerGuide
git config core.autocrlf input
pnpm install

# 3. Roadmap в GitHub
chmod +x scripts/create-roadmap-issues.sh scripts/create-phase-issues.sh
./scripts/create-roadmap-issues.sh --dry-run
./scripts/create-roadmap-issues.sh
./scripts/create-phase-issues.sh --dry-run
./scripts/create-phase-issues.sh

# 4. Проверка
gh issue list --label roadmap --limit 5
start https://github.com/zuevfoton-art/AllerGuide/milestones
```

После этого можно брать первую задачу **P1.1a** (Neon staging Postgres) и создавать ветку по §7.

---

## 12. Связанные документы

- [phase1-phase2-issues.md](./phase1-phase2-issues.md) — таблицы зависимостей и оценки
- [roadmap-to-prod.md](./roadmap-to-prod.md) — Bootstrap milestones
- [development-rules.md](./development-rules.md) — чеклист перед merge
- [architecture.md](./architecture.md) — куда класть код
