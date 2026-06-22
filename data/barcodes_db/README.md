# Локальная база штрихкодов

## Быстрый старт (небольшие файлы, до ~5 MB)

1. Положите JSON/CSV/SQLite в `data/barcodes_db/`
2. Запустите:

```bash
pnpm import:barcodes
```

Результат: `packages/core/src/data/barcodes-catalog.json` (вшивается в приложение).

---

## Большой CSV (50–500 MB) — рекомендуемый способ

**Не коммитьте** CSV и большой SQLite в Git. Конвертируйте CSV в SQLite локально перед сборкой приложения.

### Шаг 1. Скопируйте CSV (не в Git)

Windows:

```
C:\Users\i.zuev\Desktop\ИВА\МОЕ\AG\barcodes_db\products.csv
```

Можно оставить файл где угодно на диске — путь передаётся в команду импорта.

### Шаг 2. Конвертация CSV → SQLite (потоково, без загрузки 250 MB в RAM)

PowerShell:

```powershell
$env:BARCODES_CSV_PATH="C:\Users\i.zuev\Desktop\ИВА\МОЕ\AG\barcodes_db\products.csv"
pnpm import:barcodes:sqlite
```

Или явно:

```powershell
pnpm import:barcodes:sqlite "C:\Users\i.zuev\Desktop\ИВА\МОЕ\AG\barcodes_db\products.csv"
```

Результат:

```
apps/mobile/assets/barcodes/catalog.sqlite
```

Обычно SQLite получается **меньше CSV** (часто 80–150 MB вместо 250 MB).

### Шаг 3. Соберите приложение

```bash
cd apps/mobile
npx expo run:android
# или
npx expo run:ios
```

При первом запуске SQLite копируется в память устройства и используется для offline-поиска.

### Шаг 4. Проверка

Сканер → режим «Продукт» → штрихкод из вашей базы.  
Источник в результате: **«локальная база штрихкодов»**.

---

## Формат CSV

Кодировка: **UTF-8** (или UTF-8 с BOM).

Разделитель: `,` или `;`.

Обязательные колонки (любое из имён):

| Штрихкод | Название | Состав |
|----------|----------|--------|
| `barcode`, `ean`, `ean13`, `gtin`, `code`, `штрихкод` | `name`, `product_name`, `название` | `ingredients`, `состав`, `ingredients_text` |

Опционально: `brand` / `бренд`, `category` / `категория`.

Пример:

```csv
barcode;name;ingredients;brand
4607025392138;Шоколад Аленка;сахар, молоко, какао;Аленка
```

---

## Что не делать с файлом 250 MB

| Действие | Почему плохо |
|----------|--------------|
| Коммитить CSV в Git | Лимиты GitHub, долгий clone |
| `pnpm import:barcodes` на 250 MB CSV | Создаст огромный JSON, приложение не запустится |
| Хранить всё в памяти (Map) | Out of memory на телефоне |

---

## Порядок поиска в сканере

1. SQLite-каталог (`catalog.sqlite`)
2. Маленький JSON-каталог (если есть)
3. Open Food Facts (интернет)
4. Анализ штрихкода как текста (fallback)

---

## .gitignore

В репозитории игнорируются большие локальные файлы:

- `data/barcodes_db/*.csv`
- `apps/mobile/assets/barcodes/catalog.sqlite` (кроме dev-сборки у вас локально)

В Git остаётся только маленький placeholder SQLite для CI.
