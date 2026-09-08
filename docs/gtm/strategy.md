# A-Claro — Go-to-Market Strategy

**Продукт:** A-Claro (master brand **Aclearo**)  
**Версия:** 1.0.4 · Слоган: «Aclearo — когда важна ясность»  
**OKR:** [`okr.md`](./okr.md) · Рамки решений: [`playbook.md`](./playbook.md) · Collateral index: [`README.md`](./README.md)

Адаптировано из GTM-плана AllerGuide под текущий бренд и код. **Не редактировать** исходный plan-файл агента.

---

## 1. Допущения

- Первичный рынок: **Россия → СНГ → EU**
- Монетизация: **бесплатное ядро + PRO за облачный ИИ (Store IAP) + B2B2C через клиники**; affiliate (Яндекс Маркет) — опционально, за флагом `EXPO_PUBLIC_MARKET`

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

1. **ICP-1:** родитель ребёнка (до 12) с подтверждённой пищевой аллергией, ведёт элиминационную диету  
2. **ICP-2:** взрослый с поллинозом/астмой, на АСИТ или готовится к ней (сезонный)  
3. **Канал, не ICP:** врачи-аллергологи — рекомендатели, не платящие пользователи  
4. **Tertiary:** СНГ/EU; pharma/B2B2C  
5. **Anti-ICP (не таргетировать):** ЗОЖ-аудитория, которой нужен generic-сканер Е-добавок

Критерии отбора по пяти осям и обоснование anti-ICP — [`playbook.md` §1](./playbook.md#1-как-определить-icp).

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

Модель зафиксирована в [`subscription-monetization-plan.md`](../subscription-monetization-plan.md) (код — фаза P5.7, пока не реализован).

| Tier | Содержание |
|------|------------|
| Trial (7 дней) | Всё, включая облачный ИИ |
| Free (бессрочно) | Профили, дневник **без лимита записей**, SOS, карта, локальный keyword-скан, PDF |
| PRO (~299–499 ₽/мес, Store IAP) | Облачный ИИ: LLM-вердикт, dish vision, OCR, medicine recognize, cloud STT |
| Affiliate (опционально) | Яндекс Маркет deep-links (`market_click`) — при `EXPO_PUBLIC_MARKET=true` |
| B2B (later) | White-label клиник / школы |

Рамка оффера: «безопасность бесплатна навсегда, платите за облачный ИИ» — [`playbook.md` §2](./playbook.md#2-как-сформулировать-оффер).  
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
| ICP / оффер / PMF / CAC | [`playbook.md`](./playbook.md) |

## 7. Метрики

См. OKR O2–O5. North Star: **WEAC**. Targets: onboarding ≥70%, D7 ≥25% (beta), crash-free ≥99.5%, store ≥4.5.

Дерево метрик, разделение vanity и решающих, одна главная метрика на фазу — [`playbook.md` §6](./playbook.md#6-какие-метрики-действительно-важны). Критерии PMF — [`playbook.md` §3](./playbook.md#3-как-найти-product-market-fit).

## 8. Риски

Medical claims · 152-ФЗ · ADAIR brand misuse · scanner false negatives · early paid before quality.

## 9. Immediate next (human)

1. Подписать draft ADAIR (legal)  
2. Включить analytics/Sentry на staging  
3. Задеплоить landing на aclearo.com  
4. Провести ≥5 pricing interviews  
5. EAS metadata push после store credentials  
