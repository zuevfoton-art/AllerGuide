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
| FAB new entry | `pinnedBottom` primary CTA (`diary-new-entry`) |
| — | Курс / Отчёт secondary row (оставляем) |
| — | insights + condition cards ниже timeline |

## Не трогаем

`diary-new-entry`, `diary-setup-course`, `diary-report`, editor/wizard модалки, сервисы дневника.
