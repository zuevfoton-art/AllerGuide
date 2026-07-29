# Экранные формы — Cursor Canvas → handoff

As-is макеты существующих экранов AllerGuide / A-Claro для визуальных правок в **Cursor Canvas** и последующего переноса в `apps/mobile`.

Связано: [`../architecture.md`](../architecture.md) · [`../development-rules.md`](../development-rules.md) · [`../design-mockup.html`](../design-mockup.html) · [`../brand-dual-calm.md`](../brand-dual-calm.md)

---

## Состав пакета

| Файл | Назначение |
|------|------------|
| [`index.html`](./index.html) | Оглавление: макет → route → код |
| [`_tokens.css`](./_tokens.css) | Dual Calm токены (= `theme.ts`) |
| [`_phone-frame.css`](./_phone-frame.css) | Рамка телефона + примитивы UI |
| [`sos.html`](./sos.html) | `/(tabs)/sos` |
| [`home.html`](./home.html) | `/(tabs)/home` |
| [`diary.html`](./diary.html) | `/(tabs)/diary` |
| [`scanner.html`](./scanner.html) | `/(tabs)/scanner` |

---

## Как править в Cursor Canvas

1. Откройте нужный файл (`sos.html` …) в Cursor Canvas.
2. Меняйте только HTML/CSS макета — **не** правьте `app/**/*.tsx` «на глаз» из Canvas.
3. Цвета / радиусы / шрифты — только переменные из `_tokens.css`.
4. Блоки помечены `data-component="…"` — сохраняйте эти имена (handoff к компонентам).
5. Ширина контента — phone frame **390×844** (как web phone preview).
6. Утвердили визуал → отдельный PR на код **одного** экрана.

---

## Чеклист handoff в код

- [ ] Макет утверждён (состояние: default / empty / …)
- [ ] Дельты записаны (что меняется относительно as-is)
- [ ] UI только в `app/*.tsx` + `src/components/*`; домен не трогаем
- [ ] Новые цвета/отступы сначала в `theme.ts`, затем в `_tokens.css`
- [ ] Строки через `useTranslation()` + все 6 локалей + `types.ts`
- [ ] Empty / error / loading — `EmptyState` / `ErrorState` / `Skeleton`
- [ ] Сверка: web `localhost:5000` ↔ макет
- [ ] Offline-first и слои не нарушены (нет DB/API в экране)

### Формат записи в PR

```
Макет: docs/screens/sos.html (состояние: default)
Код:   app/(tabs)/sos.tsx, SosEmergencyBar.tsx
Дельты: …
```

---

## Приоритет экранов

1. SOS  
2. Home  
3. Diary  
4. Scanner  

---

## Чего не делать

- Не сливать все экраны в один HTML.
- Не вводить schema-builder / Storybook в этом пакете.
- Не копировать хардкод строк из макета в TSX без i18n.
- Не считать HTML источником правды **после** merge — после handoff правда в коде.
