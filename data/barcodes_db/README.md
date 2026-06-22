# Локальная база штрихкодов

Скопируйте содержимое папки с вашего компьютера в эту директорию:

```
C:\Users\i.zuev\Desktop\ИВА\МОЕ\AG\barcodes_db  →  data/barcodes_db/
```

## Поддерживаемые форматы

- SQLite: `*.db`, `*.sqlite`
- JSON: массив объектов или словарь `{ "штрихкод": { "name": "...", "ingredients": "..." } }`
- CSV: колонки `barcode` / `ean`, `name` / `product_name`, `ingredients` / `состав`

## Импорт в приложение

Из корня репозитория:

```bash
pnpm import:barcodes
```

Или с указанием пути напрямую (Windows):

```powershell
$env:BARCODES_DB_PATH="C:\Users\i.zuev\Desktop\ИВА\МОЕ\AG\barcodes_db"
pnpm import:barcodes
```

Результат сохраняется в `packages/core/src/data/barcodes-catalog.json` и подключается к сканеру offline-first (локальная база → Open Food Facts).
