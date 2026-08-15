# Launch week playbook — A-Claro (GTM O3)

**Продукт:** A-Claro by Aclearo · Domain: aclearo.com  
**Зависимости:** ADAIR agreement (O1), analytics/Sentry (O2), store listings (P3.2), beta gates ([`beta-cohort.md`](./beta-cohort.md))

## Pre-flight (D−14 … D−1)

| Day | Action | Owner |
|-----|--------|-------|
| D−14 | Go/No-Go: 0 P0, crash-free ≥99.5%, legal signed | Product + QA + Legal |
| D−10 | Freeze store screenshots + metadata (`store.config.json`) | Marketing |
| D−7 | Press kit + release draft to embargo list | Press |
| D−7 | ADAIR clinics confirm QR placement | Partners |
| D−3 | App Store / Play «Ready for sale» or staged rollout 10% | Mobile |
| D−3 | Landing waitlist → store CTA ([`landing/index.html`](./landing/index.html)) | Web |
| D−1 | Retargeting audiences: incomplete onboarding (beta), waitlist | Growth |

## Launch week

| Day | Action |
|-----|--------|
| **D0** | Stores live · aclearo.com hero CTA · social posts (RU) · ADAIR email/newsletter if agreed |
| **D+1** | Webinar / live Q&A с экспертом АДАИР (30–40 мин): дневник + PDF + SOS |
| **D+2** | Case note: «PDF для врача за 30 секунд» (анонимный) |
| **D+3** | ASO monitor: keyword ranks, convert screenshots if CTR low |
| **D+7** | Cohort review: installs, onboarding %, crash-free, NPS; decide paid test budget |
| **D+14** | Retarget incomplete onboarding; clinic QR refill |

## Press release (draft RU)

**Заголовок:** Aclearo запускает A-Claro — мобильный помощник при аллергии с экспертизой АДАИР  

**Лид:** Компания Aclearo объявляет о запуске приложения A-Claro для iOS и Android. Продукт помогает людям с аллергией и их родителям проверять продукты, вести дневник наблюдений, следить за пыльцой и качеством воздуха, пользоваться картой клиник АДАИР и быстро показывать экстренный аллергопаспорт.  

**Цитата (placeholder):** «Наша задача — ясность в ежедневных решениях при аллергии, без подмены врача.» — Aclearo  

**Disclaimer в конце каждого релиза:** A-Claro не является медицинским изделием и не заменяет консультацию специалиста.

Полный boilerplate: [`press-kit.html`](./press-kit.html)

## Webinar outline (40 мин)

1. Проблема разрозненных записей (5)  
2. Demo: профиль → скан → дневник → PDF (15)  
3. SOS для детей (5)  
4. Карта пыльцы / клиники АДАИР (5)  
5. Q&A + disclaimer (10)

## ASO / creative

- Primary RU keywords: see [`store-metadata.md`](./store-metadata.md)  
- Creative angles: scanner verdict, SOS for school, PDF for visit, pollen clarity  
- Avoid fear-mongering visuals

## Retargeting (incomplete onboarding)

**Audience:** installed but no `onboarding_completed` in 48h (beta analytics).  
**Message:** «Создайте профиль за 3 минуты — сканер и SOS заработают сразу.»  
**Channel:** email / push (if permission) / VK — compliance review first.  
**Budget:** только после O2.1 + O4.1 gates; lean 50–100K ₽ test.

## Kill criteria (pause paid / PR)

- Crash-free &lt; 99%  
- Store rating &lt; 4.0 with medical-claim complaints  
- Legal hold on ADAIR naming  
- P0 data-loss bug

## Roles

| Role | Launch week focus |
|------|-------------------|
| Product | Funnel metrics, Go/No-Go |
| Marketing | Posts, ASO, webinar ops |
| Medical | Webinar + content approve |
| Support | `support@aclearo.com` SLA &lt;4h beta |
| Eng | Hotfix only |
