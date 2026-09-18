# Gap: Figma → Diary (UX only)

Дата: 2026-09-18 · `3328:214` `screen-diary` → `/(tabs)/diary`

## Победители

| Слой | Источник |
|------|----------|
| UI / композиция / токены | Figma |
| Handlers, picker, editor, course, report, insights | текущий код |

## Каркас

| Figma | Код |
|-------|-----|
| screen-header | eyebrow + title + profile chip |
| calendar-strip | `WeekRingCard` (поверх списка) |
| timeline / entry-card | history `GlassCard` rows |
| fab-row → fab 56×56 | `DiaryNewEntryFab` в `pinnedBottom` (`diary-new-entry`) |
| — | Ask FAB поднимается на `/diary` (`askFabBottomOffset`) |
| — | Курс / Отчёт secondary row (оставляем) |
| — | insights + condition cards ниже timeline |

## Dual FAB

На дневнике screen-level «+» и глобальный Ask делят правый нижний угол. Ask поднимается на `tapMinHeightFab + space[3]`, чтобы оба оставались видимыми и кликабельными.

## Не трогаем

`diary-new-entry`, `diary-setup-course`, `diary-report`, editor/wizard модалки, сервисы дневника.
