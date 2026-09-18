# Gap: Figma → Map (UX only)

Дата: 2026-09-18 · `3328:333` `screen-map` → `/(tabs)/map`

## Победители

| Слой | Источник |
|------|----------|
| UI / map-frame / sheet | Figma |
| Pollen, layers, places, doctors | текущий код |

## Каркас

| Figma | Код |
|-------|-----|
| screen-header | title + profile |
| map-frame + chips | `MapCanvas` + overlay switcher/status |
| bottom-sheet | status, details, places, doctors, disclaimer |

## Не трогаем

Layer handlers, allergen picker, places/doctors flags, pollen snapshot.
