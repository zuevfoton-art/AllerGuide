# A-Claro — Go-to-Market OKR

**Продукт:** A-Claro (master brand **Aclearo**)  
**Версия приложения:** 1.0.4 (`apps/mobile/app.json`)  
**Слоган:** «Aclearo — когда важна ясность»  
**Домен:** [aclearo.com](https://aclearo.com) · API `api.aclearo.com`  
**Стиль:** Claro Green ([`docs/brand-claro-green.md`](../brand-claro-green.md), accent `#2A9D8F`)

Связанные материалы: [`README.md`](./README.md) · [`patient-one-pager.html`](./patient-one-pager.html) · [`doctor-brief.html`](./doctor-brief.html) · [`press-kit.html`](./press-kit.html) · product roadmap [`roadmap-to-prod.md`](../roadmap-to-prod.md) · brand rollout [`brand-rollout.md`](../brand-rollout.md)

---

## North Star

**Активные пользователи, которые еженедельно ведут дневник или сканируют продукты и хотя бы раз показали SOS/PDF врачу или медработнику.**

Proxy-метрика: *Weekly Engaged Allergy Controllers* (WEAC) = MAU с ≥1 diary entry **или** ≥1 scan **и** (SOS view **или** doctor PDF) за 30 дней.

---

## Positioning (для всех OKR)

> **A-Claro** — приложение Aclearo для ясности при аллергии: сканер, дневник, карта пыльцы и мест, аллергопаспорт SOS и отчёт для врача. Offline-first. С экспертизой АДАИР. Не ставит диагноз и не заменяет врача.

**Primary ICP:** родители детей с пищевой аллергией (RU) + взрослые с поллинозом/астмой.  
**Primary channel:** клиники АДАИР → рекомендация врача → пациент.

---

## Horizon

| Cycle | Фокус | Gate |
|-------|--------|------|
| **Q0** (сейчас → soft launch) | Credibility + closed beta | Crash-free ≥99%, ADAIR agreement, store metadata draft |
| **Q1** (public launch ±30d) | Acquisition + activation | Stores live, onboarding ≥65%, WEAC baseline |
| **Q2** (launch +90d) | Retention + monetization signal | D30 ≥12%, premium WTP validated, affiliate live |
| **Q3+** | Scale RU → CIS / EU | D30 ≥15%, NPS ≥40, local medical partner |

OKR ниже — **Q0→Q1 launch cycle** (привязка к Phase 3–4 roadmap). Цифры — targets; фактические даты зависят от store readiness.

---

## O1. Сделать A-Claro «рекомендуемым» в клиниках АДАИР

**Почему:** главный trust-канал и CAC ≈ 0 при рекомендации врача.

| KR | Target | Evidence |
|----|--------|----------|
| KR1.1 | Подписано co-marketing соглашение Aclearo × АДАИР (правила бренда, disclaimers) | Юр. документ |
| KR1.2 | ≥5 клиник АДАИР размещают QR / one-pager на ресепшене | Фото + список клиник |
| KR1.3 | ≥10 аллергологов прошли doctor brief и дали written feedback на PDF-отчёт | Опрос / Notion |
| KR1.4 | ≥25% installs soft-launch cohort — clinic / doctor referral | Analytics `utm_source=clinic` / survey |
| KR1.5 | 0 critical medical-claim incidents в store review / прессе | Legal log |

**Owner:** Product + Medical advisor (проф. Смолкин / board) + Legal  
**Collateral:** [`doctor-brief.html`](./doctor-brief.html), [`patient-one-pager.html`](./patient-one-pager.html)

---

## O2. Закрыть product readiness для публичного store release

**Почему:** health-app не масштабируют paid/PR до crash-free и compliance.

| KR | Target | Evidence |
|----|--------|----------|
| KR2.1 | Crash-free sessions ≥99.5% на staging soak ≥14 дней | Sentry (включить DSN) |
| KR2.2 | Onboarding completion ≥70% в closed beta (n≥200) | Analytics `profile_created` / funnel |
| KR2.3 | Go/No-Go checklist Phase 4: 0 P0, E2E smoke green, legal signed | [`roadmap-to-prod.md`](../roadmap-to-prod.md) P4.2 |
| KR2.4 | Store listings A-Claro на 6 языках + medical disclaimer | App Store / Play draft |
| KR2.5 | 152-ФЗ / GDPR: export + account deletion + server wipe path | QA + legal sign-off |
| KR2.6 | Brand rollout Phase 0–1: domains, support@aclearo.com, bundle `com.aclearo.app` | [`brand-rollout.md`](../brand-rollout.md) |

**Owner:** Mobile + QA + Legal + DevOps  
**Product truth (не обещать в GTM):** полноценный OCR «из коробки», telemedicine, cloud sync default-on, marketplace checkout.

---

## O3. Запустить публично и набрать первую волну пользователей

**Почему:** без installs нет retention и монетизации.

| KR | Target (launch +30d) | Evidence |
|----|----------------------|----------|
| KR3.1 | A-Claro live в App Store + Google Play | Store URLs |
| KR3.2 | ≥5 000 installs | Store console |
| KR3.3 | ≥2 500 MAU | Analytics |
| KR3.4 | Organic share ≥60% installs | Attribution |
| KR3.5 | Store rating ≥4.5 (при ≥50 отзывах) | Stores |
| KR3.6 | Landing aclearo.com: waitlist → store CTA, press kit published | Web + [`press-kit.html`](./press-kit.html) |
| KR3.7 | ≥1 ADAIR / expert webinar или PR-актив в launch week | Recording / press |

**Owner:** Marketing + Product  
**Channels (priority):** ADAIR clinics → ASO (RU) → patient Telegram/VK → content from Expert → micro-influencers (compliance-reviewed) → paid только после PMF.

---

## O4. Доказать engagement на core loops

**Почему:** WEAC и retention важнее vanity installs.

| KR | Target (launch +30d / beta) | Evidence |
|----|-----------------------------|----------|
| KR4.1 | D7 retention ≥20% (beta ≥25%) | Cohort analytics |
| KR4.2 | ≥3 scans / active user / week (median among scanners) | `scan_completed` |
| KR4.3 | ≥40% MAU с ≥1 diary entry / week | Diary events |
| KR4.4 | ≥15% MAU открыли SOS ≥1 раз / месяц | `sos_viewed` |
| KR4.5 | ≥10% MAU сгенерировали doctor PDF / месяц | `doctor_report_generated` |
| KR4.6 | Map: ≥25% MAU открыли слой пыльцы в сезон | Map analytics |
| KR4.7 | NPS ≥35 (launch +30d) | In-app / email survey |

**Core loops to instrument:**  
1. Scan → verdict → (optional) safe list  
2. Diary → wellness index → recommendation  
3. Before visit → doctor PDF  
4. High pollen → map / clinics CTA → SOS readiness

**Owner:** Product + Analytics  
**Flags:** включить `EXPO_PUBLIC_ANALYTICS_ENABLED` до beta.

---

## O5. Заложить unit economics без paywall на safety

**Почему:** SOS, базовый сканер и дневник остаются бесплатными (trust + store ethics).

| KR | Target (launch +90d) | Evidence |
|----|----------------------|----------|
| KR5.1 | Validated WTP: ≥30 customer interviews → premium price band 299–499 ₽/мес | Interview notes |
| KR5.2 | Freemium design locked: Free = profiles, diary, SOS, base scanner, PDF, map calendar; Premium = AI scan, cloud sync, advanced pollen push / insights | Feature matrix |
| KR5.3 | Yandex Market affiliate live: ≥100 `market_click` / месяц, ≥1 paid conversion tracked | API + analytics |
| KR5.4 | Blended CAC < 150 ₽ (если paid on) | Ads + organic mix |
| KR5.5 | Premium conversion target model ≥3% MAU (not required by +90d; instrument funnel) | Paywall events |

**Owner:** Product + Growth  
**Non-goal Q1:** white-label B2B, telemedicine revenue.

---

## O6. Удержать medical & brand clarity (Aclearo)

**Почему:** ребрединг AllerGuide → A-Claro / Aclearo и medical claims — главный reputational risk.

| KR | Target | Evidence |
|----|--------|----------|
| KR6.1 | 100% GTM/store copy использует A-Claro + Aclearo lockup; запрещённые написания = 0 | Brand audit |
| KR6.2 | Все patient/press materials содержат medical disclaimer | Collateral checklist |
| KR6.3 | PDF врача и Expert: корректный брендинг A-Claro; Смолкин/АДАИР — только где разрешено соглашением | Legal review |
| KR6.4 | Press kit актуален под v1.0.4 features (6 tabs, UPI/UAQI map, Yandex Market, voice diary) | [`press-kit.html`](./press-kit.html) |

**Owner:** Brand + Legal + Marketing

---

## Scorecard (сводка)

| Objective | Leading signal | Lagging signal |
|-----------|----------------|----------------|
| O1 ADAIR | Clinics with QR | % referral installs |
| O2 Readiness | Crash-free / Go-No-Go | Store approval |
| O3 Launch | Installs / MAU | Rating |
| O4 Engagement | Scans + diary / week | D7 / NPS |
| O5 Economics | market_click + WTP | Premium conversion |
| O6 Brand | Copy audit | 0 claim incidents |

---

## Instrumentation (обязательно до beta)

Включить и проверить события (см. mobile analytics service):

| Event | OKR |
|-------|-----|
| `profile_created` | O2, O4 |
| `scan_completed` | O4 |
| `doctor_report_generated` | O1, O4 |
| `sos_viewed` | O4 |
| `market_click` | O5 |
| Screen views: home, diary, map, scanner | O4 |
| Attribution / utm (clinic, organic, paid) | O1, O3 |

Sentry DSN + source maps — KR2.1.

---

## Product snapshot for KR owners (code truth)

| Area | Current (v1.0.4) |
|------|------------------|
| Tabs | Home, Diary, Scanner, Market, Map, SOS |
| Brand | A-Claro / Aclearo, Claro Green `#2A9D8F`, slogan clarity |
| Scanner | 4 modes; OFF barcode; OCR/vision behind flags/limits |
| Diary | Adaptive wizard; scales on `/clinical-scales`; voice STT; skin photos; ASIT + prescribed therapy |
| Map | Unified pollen/places; UPI 0–5; 17 taxa picker; UAQI card; Places API behind flags; ADAIR POI |
| Market | Curated catalog + Yandex Market affiliate resolve |
| SOS | Emergency-only view; passport; AppLock emergency card |
| Doctor PDF | 7/14/30/custom; ICD/SNOMED; A-Claro branding |
| Offline | Core local; network = pollen/AQ/OFF/Places/sync enrichment |
| Flags default OFF | Backend auth, AI scan, cloud sync, analytics, live map/places keys |

---

## Quarterly review ritual

1. Score each KR: on track / at risk / missed  
2. Kill or rephrase KR if product truth changed (update this file + HTML kits)  
3. Re-gate O3 paid spend on O2.1 + O4.1  
4. Sync with [`roadmap-to-prod.md`](../roadmap-to-prod.md) Phase 3–5

---

## Immediate next actions (this week)

1. Legal: draft ADAIR co-marketing (O1.1)  
2. Analytics + Sentry on staging (O2.1, O4)  
3. Print patient one-pager for 1–2 pilot clinics (O1.2)  
4. Schedule 5 parent + 5 adult discovery interviews for premium WTP (O5.1)  
5. Publish aclearo.com landing stub + press kit (O3.6, O6.4)
