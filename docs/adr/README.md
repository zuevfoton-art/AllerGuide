# Architecture Decision Records (ADR)

Краткие решения по архитектуре AllerGuide. Каждый ADR фиксирует контекст, решение и последствия.

| ADR | Тема | Статус |
|-----|------|--------|
| [001-dual-write.md](./001-dual-write.md) | Offline-first dual-write при backend auth | Accepted (Phase 1) |
| [002-sync-conflict-policy.md](./002-sync-conflict-policy.md) | Политика конфликтов sync | Accepted |
| — | Провайдер live-пыльцы (Яндекс B2B vs Open-Meteo + embed) | Proposed — см. [`yandex-pollen-map-integration.md`](../yandex-pollen-map-integration.md) §4–5; ADR-003 после ответа Яндекса |
| — | Google basemap + `heatmapTiles` на слое «Пыление» (OM-бейдж) | Proposed — §4.5–4.6 того же документа; код после GCP keys |
| — | Stage Android APK без SDK в агенте | Accepted practice — EAS preferred · GitHub variants: [`android-stage-build.md`](../android-stage-build.md) |

Новые ADR: `docs/adr/NNN-short-title.md`, ссылка из [`architecture.md`](../architecture.md).
