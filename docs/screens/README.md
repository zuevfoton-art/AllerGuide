# Экранные формы — Canvas (Desktop) → handoff

As-is макеты существующих экранов AllerGuide / A-Claro.

- **Cursor Desktop (Agent Window)** — редактируемые mockup-canvas (телефон + поля копирайта).
- **HTML** — `docs/screens/*.html` (источник для sync / браузер / Cloud web fallback).

Связано: [`../architecture.md`](../architecture.md) · [`../development-rules.md`](../development-rules.md) · [`../design-mockup.html`](../design-mockup.html) · [`../brand-dual-calm.md`](../brand-dual-calm.md)

---

## Cursor Desktop Canvas (рекомендуется)

Требуется Cursor Desktop **≥ 3.13** (билд `31e8d61…` подходит). Откройте canvas рядом с чатом:

| Canvas | Назначение |
|--------|------------|
| [a-claro-mockups.canvas.tsx](/home/ubuntu/.cursor/projects/workspace/canvases/a-claro-mockups.canvas.tsx) | Каталог + live edit copy + preview |
| [mockup-sos.canvas.tsx](/home/ubuntu/.cursor/projects/workspace/canvases/mockup-sos.canvas.tsx) | SOS (default / empty) |
| [mockup-home.canvas.tsx](/home/ubuntu/.cursor/projects/workspace/canvases/mockup-home.canvas.tsx) | Home (default / loading) |
| [mockup-diary.canvas.tsx](/home/ubuntu/.cursor/projects/workspace/canvases/mockup-diary.canvas.tsx) | Diary (default / empty) |
| [mockup-scanner.canvas.tsx](/home/ubuntu/.cursor/projects/workspace/canvases/mockup-scanner.canvas.tsx) | Scanner (default / safe / error) |

**Как редактировать**

1. Откройте нужный `.canvas.tsx` (клик по ссылке в чате).
2. Меняйте тексты в полях слева — preview справа обновляется сразу (состояние сохраняется).
3. Переключайте состояния (default / empty / …).
4. Для правок layout: кнопка Ask agent to edit или запрос в чат.
5. Утвердили → sync в HTML `docs/screens/<screen>.html` → handoff PR в `apps/mobile`.

Canvas живёт в managed-папке агента `~/.cursor/projects/<workspace>/canvases/` (не в git). HTML в `docs/screens/` — в репозитории.

---

## HTML-пакет (в репо)

| Файл | Назначение |
|------|------------|
| [`index.html`](./index.html) | Оглавление |
| [`board.html`](./board.html) | Доска handoff в браузере (fallback) |
| [`_tokens.css`](./_tokens.css) | Dual Calm токены (= `theme.ts`) |
| [`_phone-frame.css`](./_phone-frame.css) | Рамка + примитивы |
| `sos.html` · `home.html` · `diary.html` · `scanner.html` | As-is HTML |

---

## Чеклист handoff в код

- [ ] Макет утверждён (состояние отмечено)
- [ ] Дельты записаны относительно as-is
- [ ] UI только в `app/*.tsx` + `src/components/*`
- [ ] Новые цвета/отступы: `theme.ts` → `_tokens.css`
- [ ] Строки через `useTranslation()` + 6 локалей
- [ ] Empty / error / loading — общие компоненты
- [ ] Сверка: web `localhost:5000` ↔ макет
- [ ] Offline-first: нет DB/API в экране

```
Макет: docs/screens/sos.html + mockup-sos.canvas.tsx (состояние: default)
Код:   app/(tabs)/sos.tsx, SosEmergencyBar.tsx
Дельты: …
```

## Приоритет

1. SOS · 2. Home · 3. Diary · 4. Scanner
