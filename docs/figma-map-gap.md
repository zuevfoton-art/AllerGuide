# Gap: Figma Make zip → Map

Дата: 2026-09-18 · `/(tabs)/map`

**MapScreen в zip нет** — карту не выдумывать. Текущий map chrome остаётся; токены (Work Sans, zip radii, palette) общие.

## Победители

| Слой | Источник |
|------|----------|
| Композиция карты | текущий код (нет zip-кадра) |
| Pollen, layers, places, doctors | текущий код |
| Цвета / тип / радиусы | zip tokens |

## Каркас

| Zip | Код |
|-----|-----|
| — | `MapCanvas` + overlay switcher/status |
| — | bottom-sheet: status, details, places, doctors |

## Не трогаем

Layer handlers, allergen picker, places/doctors flags, pollen snapshot.
