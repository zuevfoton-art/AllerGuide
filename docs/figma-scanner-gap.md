# Gap: Figma Make zip → Scanner

Дата: 2026-09-18 · zip `code-17.txt` → `/(tabs)/scanner`

Канон композиции — **Figma Make zip**, не live-фрейм `3328:280`.

## Победители

| Слой | Источник |
|------|----------|
| UI / cam-zone / result | zip |
| Scan pipeline, barcode, manual, dish | текущий код |

## Каркас

| Zip | Код |
|-----|-----|
| title «Сканирование продукта» | `scanner.productScanTitle` |
| cam 280 + reticle | `scanner-primary-camera` |
| инструкция | zip copy |
| result «Опасно» + состав highlight | `ScannerResultPanel` |
| — | barcode/manual остаются handlers, визуал primary — камера |

## Не трогаем

`scanner-primary-camera`, `scanner-barcode`, `scanner-toggle-manual`, result/save handlers.
