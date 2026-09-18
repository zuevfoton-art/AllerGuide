# Gap: Figma → Scanner (UX only)

Дата: 2026-09-18 · `3328:280` `screen-scanner` → `/(tabs)/scanner`

## Победители

| Слой | Источник |
|------|----------|
| UI / cam-zone / result cards | Figma |
| Scan pipeline, barcode, manual, dish | текущий код |

## Каркас

| Figma | Код |
|-------|-----|
| screen-header | title + profile |
| scanner-container / cam-view | primary camera zone + barcode/manual |
| scan-result / ingredients | `ScannerResultPanel` |
| — | history lists, undo, crop modal |

## Не трогаем

`scanner-primary-camera`, `scanner-barcode`, `scanner-toggle-manual`, result/save handlers.
