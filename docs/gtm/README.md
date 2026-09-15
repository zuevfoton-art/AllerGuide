# A-Claro — GTM-материалы

Go-to-market для **A-Claro** (master brand **Aclearo**).

| Документ | Назначение |
|----------|------------|
| [`strategy.md`](./strategy.md) | Полная GTM-стратегия (позиционирование, фазы, каналы) |
| [`okr.md`](./okr.md) | **OKR** O1–O6 и KR |
| [`playbook.md`](./playbook.md) | **Рамки решений:** ICP, оффер, PMF, стоп-лист до масштабирования, первые системные продажи, метрики, партнёрский канал, CAC |
| [`adair-co-marketing-agreement-draft.md`](./adair-co-marketing-agreement-draft.md) | Черновик co-marketing с АДАИР |
| [`patient-one-pager.html`](./patient-one-pager.html) | Листовка A4 для пациентов |
| [`doctor-brief.html`](./doctor-brief.html) | Бриф для врачей |
| [`press-kit.html`](./press-kit.html) | Пресс-кит + brand |
| [`landing/index.html`](./landing/index.html) | Waitlist landing (beta) |
| [`analytics-beta.md`](./analytics-beta.md) | Analytics checklist для beta |
| [`pricing-discovery.md`](./pricing-discovery.md) | Скрипт customer discovery / WTP |
| [`store-metadata.md`](./store-metadata.md) | Store listings + medical disclaimer |
| [`beta-cohort.md`](./beta-cohort.md) | План closed beta 200–500 |
| [`launch-playbook.md`](./launch-playbook.md) | Launch week |
| [`gtm-styles.css`](./gtm-styles.css) | Claro Green styles |

**App:** v1.0.4 · accent `#2A9D8F` · domain `aclearo.com`  
**Brand rollout:** [`../brand-rollout.md`](../brand-rollout.md)

## Снимок продукта

**5 видимых вкладок** (Главная, Дневник, Сканер, Карта, SOS) · UPI/UAQI карта · туры подсказок при первом запуске · offline-first · flags OFF по умолчанию.

**Маркет** (и Яндекс Маркет affiliate) скрыт за `EXPO_PUBLIC_MARKET`, по умолчанию `false` — не подавать как доступную функцию, пока флаг выключен.

Не заявлять: полный OCR везде, telemedicine, cloud sync из коробки, in-app checkout, действующую подписку (IAP — фаза P5.7).

## Экспорт HTML → PDF

Chrome → Print → Save as PDF (A4). QR на one-pager заменить на store / TestFlight перед печатью.
