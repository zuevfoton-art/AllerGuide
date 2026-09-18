# Gap: Figma Make zip → Diary

Дата: 2026-09-18 · zip `code-16.txt` → `/(tabs)/diary`

Канон композиции — **Figma Make zip**, не live-фрейм `3328:214`.

## Победители

| Слой | Источник |
|------|----------|
| UI / композиция / токены | zip |
| Handlers, picker, editor, course, report | текущий код (роуты живы) |

## Каркас

| Zip | Код |
|-----|-----|
| title «Дневник симптомов» | `ScreenHeader` + `diary.symptomsTitle` |
| calendar-strip 7 дней 65h | day cells в `diary.tsx` |
| timeline + SeverityBadge | entry cards + `SeverityBadge` |
| tags `radius.full` | chips в editor/picker |
| fab 56 abs bottom 86 / right 24 | `DiaryNewEntryFab` (`diary-new-entry`) |
| — | Ask FAB поднимается на `/diary` (`askFabBottomOffset`) |
| нет курса / отчёта / week-ring / clinical cards | убраны с кадра; модалки и роуты живы |

## Dual FAB

На дневнике screen-level «+» и глобальный Ask делят правый нижний угол. Ask поднимается на `tapMinHeightFab + space[3]`, чтобы оба оставались видимыми и кликабельными. В zip Ask нет — второй круг в макет не добавляем.

## Не трогаем

`diary-new-entry`, editor/wizard модалки, сервисы дневника, роуты курса и отчёта.
