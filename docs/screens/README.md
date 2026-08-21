# Экранные формы — Desktop Canvas → handoff

## Важно: «failed to load» в Cloud Agent

Cursor Canvas **не хостится** в Cloud Agent (ни web, ни Desktop→cloud). В логах агента нет canvas host — поэтому панель показывает **failed to load**. Это ограничение среды, не ошибка макетов.

### Как открыть Canvas на Windows Desktop (локально)

1. Откройте репозиторий AllerGuide **локально** в Cursor Desktop (File → Open Folder), не Cloud Agent.
2. В PowerShell из корня репо:

```powershell
powershell -ExecutionPolicy Bypass -File docs/screens/canvas/install-windows.ps1
```

3. Запустите **local** Agent chat.
4. Откройте сначала smoke-тест:

`%USERPROFILE%\.cursor\projects\<slug>\canvases\smoke.canvas.tsx`

5. Если видно «Canvas OK» — открывайте:

- `a-claro-mockups.canvas.tsx` — каталог + live edit
- `mockup-sos.canvas.tsx` / `mockup-home` / `mockup-diary` / `mockup-scanner`

Исходники canvas лежат в репо: [`docs/screens/canvas/`](./canvas/).

### Пока работаете в этом Cloud Agent

Используйте HTML:

- [`board.html`](./board.html) — доска + чеклист
- [`sos.html`](./sos.html) · [`home.html`](./home.html) · [`diary.html`](./diary.html) · [`scanner.html`](./scanner.html)

---

## HTML-пакет

| Файл | Назначение |
|------|------------|
| [`index.html`](./index.html) | Оглавление |
| [`board.html`](./board.html) | Handoff board (браузер) |
| [`_tokens.css`](./_tokens.css) | Dual Calm (= `theme.ts`) |
| [`_phone-frame.css`](./_phone-frame.css) | Phone frame |
| `sos.html` · `home.html` · `diary.html` · `scanner.html` | As-is макеты |
| [`canvas/`](./canvas/) | Portable `.canvas.tsx` + install scripts |

---

## Чеклист handoff

- [ ] Макет утверждён
- [ ] Дельты записаны
- [ ] UI в `app/*.tsx` + `src/components/*`
- [ ] Токены: `theme.ts` → `_tokens.css`
- [ ] i18n: 6 локалей
- [ ] Empty/error/loading
- [ ] Сверка localhost:5000
- [ ] Offline-first

Приоритет: SOS → Home → Diary → Scanner
