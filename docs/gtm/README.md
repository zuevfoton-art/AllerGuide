# A-Claro — GTM-материалы

Go-to-market collateral для продукта **A-Claro** (master brand **Aclearo**).  
**Стратегия в формате OKR:** [`okr.md`](./okr.md)

**Синхронизировано с приложением:** mobile **v1.0.4** · store name A-Claro · slogan «Aclearo — когда важна ясность»  
**Бренд:** Claro Green ([`brand-claro-green.md`](../brand-claro-green.md), accent `#2A9D8F`) · rollout [`brand-rollout.md`](../brand-rollout.md)

## Снимок продукта (для копирайтеров)

| Область | Текущее состояние |
|---------|-------------------|
| Бренд | **A-Claro** / Aclearo · `aclearo.com` · bundle `com.aclearo.app` |
| Вкладки | **6:** Главная, Дневник, Сканер, Маркет, Карта, SOS |
| Главная | Двухслойный wellness index; рекомендации без названий ACT/ARIA в UI |
| Сканер | 4 режима; штрихкод OFF; OCR/vision — с оговорками / флагами |
| Дневник | Адаптивный wizard; шкалы на `/clinical-scales`; голос; фото кожи; АСИТ + терапия по назначению |
| Карта | Единый экран: пыльца (UPI, 17 taxa) + места + АДАИР; UAQI; Places API за флагами |
| Маркет | Каталог + affiliate Яндекс Маркет (без корзины в приложении) |
| SOS | Только экстренный просмотр; паспорт; emergency card при App Lock |
| Отчёт врачу | PDF 7/14/30/custom; ICD/SNOMED; брендинг A-Claro |
| Offline-first | Ядро локально; сеть = пыльца/AQ/OFF/Places/sync |
| Flags OFF по умолчанию | Backend auth, AI-scan, cloud sync, analytics |

**Не заявлять как готовое:** полноценный OCR «везде», telemedicine, cloud sync из коробки, checkout внутри приложения, per-species pollen heatmap.

## Файлы

| Файл | Назначение | Аудитория |
|------|------------|-----------|
| [`okr.md`](./okr.md) | **GTM как OKR** (O1–O6, KR, scorecard) | Product / leadership |
| [`patient-one-pager.html`](./patient-one-pager.html) | Листовка A4 | Пациенты, клиники |
| [`doctor-brief.html`](./doctor-brief.html) | Бриф 3 стр. | Аллергологи |
| [`press-kit.html`](./press-kit.html) | Пресс-кит + brand | СМИ, партнёры |
| [`gtm-styles.css`](./gtm-styles.css) | Claro Green styles | — |

## Экспорт в PDF

1. Откройте HTML в Chrome / Edge.  
2. `Ctrl+P` / `⌘P` → «Сохранить как PDF», A4, фон включён.

## Перед печатью / публикацией

- QR → реальные App Store / Google Play (A-Claro).  
- Email: `support@aclearo.com`, `press@aclearo.com`, `partners@aclearo.com`.  
- Co-marketing соглашение с АДАИР обязательно для публичного использования бренда АДАИР.

## Обновление

При смене вкладок, бренда или launch targets — обновите [`okr.md`](./okr.md) и HTML; держите версию app в шапке README.
