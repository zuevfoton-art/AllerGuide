# AllerGuide — GTM-материалы

Маркетинговые материалы для go-to-market. Стиль: **Clinical Calm** ([`docs/brand/brand-preview.html`](../brand/brand-preview.html)).

**Синхронизировано с приложением:** mobile **v1.0.4** (`apps/mobile/app.json`).

## Снимок продукта (для копирайтеров)

| Область | Текущее состояние |
|---------|-------------------|
| Вкладки | **6:** Главная, Дневник, Сканер, **Маркет**, **Карта**, SOS |
| Сканер | 4 режима: продукт, меню, лекарство, косметика |
| Дневник | 10 типов записей + шкалы ACT / ARIA / SCORAD / UAS7 |
| SOS | Аллергопаспорт (адреналин, анафилаксия 1–3, share / PDF) |
| Карта | 3 слоя: места, пыление, клиники/врачи АДАИР |
| Маркет | Статический каталог + фильтрация по профилю (без корзины/оплаты) |
| Отчёт врачу | PDF 7/14/30 дн., timeline, ICD-11 / SNOMED |
| Offline-first | Ядро без сети; Open-Meteo / OFF / sync — опционально |
| Feature flags | Backend auth, AI-scan, cloud sync, live map — **OFF** по умолчанию |
| Языки | RU, EN, ES, FR, DE, IT |

Не заявлять как готовое: полноценный OCR, marketplace checkout, телемедицина, cloud sync «из коробки».

## Файлы

| Файл | Назначение | Аудитория |
|------|------------|-----------|
| [`patient-one-pager.html`](./patient-one-pager.html) | Листовка A4 для пациентов | Клиники ADAIR, родительские сообщества |
| [`doctor-brief.html`](./doctor-brief.html) | Бриф для врачей (3 стр.) | Аллергологи, педиатры |
| [`press-kit.html`](./press-kit.html) | Пресс-кит + brand guidelines | СМИ, партнёры, инфлюенсеры |
| [`gtm-styles.css`](./gtm-styles.css) | Общие стили Clinical Calm | — |

## Экспорт в PDF

1. Откройте HTML-файл в браузере (Chrome / Edge).
2. `Ctrl+P` / `⌘P` → «Сохранить как PDF».
3. Формат: **A4**, поля по умолчанию, фоновая графика включена.

Для one-pager достаточно одной страницы. Doctor brief — 3 страницы.

## Перед печатью

- Замените placeholder QR-кода на реальные ссылки App Store / Google Play.
- Обновите контактные данные в пресс-ките (email пресс-службы).
- Убедитесь, что co-marketing соглашение с ADAIR подписано (использование бренда АДАИР).

## Brand assets

Логотипы и иконки: [`docs/brand/`](../brand/) · app icon: [`apps/mobile/assets/icon.png`](../../apps/mobile/assets/icon.png)

## Обновление

При изменении вкладок, модулей дневника/SOS или позиционирования — обновите HTML здесь и строку версии в этом README.
