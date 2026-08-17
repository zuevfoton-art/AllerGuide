# A-Claro — Go-to-Market Strategy

**Продукт:** A-Claro (master brand **Aclearo**)  
**Версия:** 1.0.4 · Слоган: «Aclearo — когда важна ясность»  
**OKR:** [`okr.md`](./okr.md) · Collateral index: [`README.md`](./README.md)

Адаптировано из GTM-плана AllerGuide под текущий бренд и код. **Не редактировать** исходный plan-файл агента.

---

## 1. Допущения

- Первичный рынок: **Россия → СНГ → EU**
- Монетизация: **бесплатное ядро + freemium + affiliate (Яндекс Маркет) + B2B2C через клиники**

## 2. Positioning

> **A-Claro** — приложение Aclearo для ясности при аллергии: сканер, дневник, карта пыльцы и мест, аллергопаспорт SOS и отчёт для врача. Offline-first. С экспертизой АДАИР. Не ставит диагноз и не заменяет врача.

### Jobs-to-be-done

| Job | Решение в продукте |
|-----|-------------------|
| «Безопасно ли мне это съесть?» | Сканер + cross-reactions (+ AI/OCR за флагами) |
| «Как объяснить врачу?» | PDF с ICD/SNOMED |
| «Что делать при реакции?» | SOS-паспорт |
| «Когда ждать обострение?» | Wellness + карта UPI/UAQI |
| «Где получить помощь?» | Карта АДАИР / medical POI |

### Сегменты

1. **Primary:** родители детей с пищевой аллергией; взрослые с поллинозом/астмой  
2. **Secondary:** АСИТ; врачи-рефереры  
3. **Tertiary:** СНГ/EU; pharma/B2B2C

### Дифференциаторы

Специализация на аллергии · АДАИР · offline-first · клинические шкалы · SOS + child profiles — не generic food scanner.

## 3. GTM-фазы ↔ product roadmap

| GTM | Фокус | Product gate |
|-----|--------|--------------|
| **G0** Medical credibility | Соглашение АДАИР, doctor brief | Draft agreement |
| **G1** Closed beta | 200–500 users, analytics | P1–P2, [`beta-cohort.md`](./beta-cohort.md) |
| **G2** Soft launch | Store metadata, 50–100 soak | P3 |
| **G3** Public launch | Stores live, launch week | P4, [`launch-playbook.md`](./launch-playbook.md) |
| **G4** Growth | Freemium + affiliate | P5 |

## 4. Каналы (priority)

1. АДАИР / клиники (QR) — низкий CAC  
2. Organic ASO  
3. Patient communities  
4. Content / Expert  
5. Doctor PDF watermark / referral  
6. Paid — только после PMF  

## 5. Монетизация

| Tier | Содержание |
|------|------------|
| Free | Профили, дневник, SOS, базовый сканер, PDF, карта (базовая) |
| Premium (~299–499 ₽/мес) | AI-скан, cloud sync, advanced pollen insights/push |
| Affiliate | Яндекс Маркет deep-links (`market_click`) |
| B2B (later) | White-label клиник / школы |

Валидация цены: [`pricing-discovery.md`](./pricing-discovery.md)

## 6. Deliverables map (plan todos)

| Todo | Artifact |
|------|----------|
| ADAIR agreement | [`adair-co-marketing-agreement-draft.md`](./adair-co-marketing-agreement-draft.md) |
| Collateral | [`patient-one-pager.html`](./patient-one-pager.html), [`doctor-brief.html`](./doctor-brief.html), [`press-kit.html`](./press-kit.html) |
| Analytics | [`analytics-beta.md`](./analytics-beta.md) + events in core/mobile |
| Landing / waitlist | [`landing/index.html`](./landing/index.html) |
| Pricing interviews | [`pricing-discovery.md`](./pricing-discovery.md) |
| Store / disclaimer | [`store-metadata.md`](./store-metadata.md), `apps/mobile/store.config.json` |
| Beta cohort | [`beta-cohort.md`](./beta-cohort.md) |
| Launch week | [`launch-playbook.md`](./launch-playbook.md) |
| OKR scorecard | [`okr.md`](./okr.md) |

## 7. Метрики

См. OKR O2–O5. North Star: **WEAC**. Targets: onboarding ≥70%, D7 ≥25% (beta), crash-free ≥99.5%, store ≥4.5.

## 8. Риски

Medical claims · 152-ФЗ · ADAIR brand misuse · scanner false negatives · early paid before quality.

## 9. Immediate next (human)

1. Подписать draft ADAIR (legal)  
2. Включить analytics/Sentry на staging  
3. Задеплоить landing на aclearo.com  
4. Провести ≥5 pricing interviews  
5. EAS metadata push после store credentials  
