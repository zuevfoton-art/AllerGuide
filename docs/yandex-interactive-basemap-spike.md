# Spike: Яндекс как интерактивный basemap (Phase 4)

Связано с [`interactive-pollen-map-plan.md`](./interactive-pollen-map-plan.md) §Phase 4 и next-step #5.  
**Цель spike:** выбрать способ сделать Яндекс Карты интерактивным basemap для RU, **без** scrape `…/allergies` и без замены Google Pollen numeric feed.

Пыльца остаётся Google (Phase 2–3). Яндекс = подложка + POI / UX.

---

## 1. Варианты

| Вариант | Платформы | Интерактив | Ключ / ToS | Оценка |
|---------|-----------|------------|------------|--------|
| **A. JS API 3.0 в WebView** | Web + native (общий) | pan/zoom, маркеры | JS API ключ; квоты; ключ лучше через API proxy / remote config | Один код; WebView UX слабее native |
| **B. Native SDK** (Android/iOS MapKit) | Native only | лучший UX | Отдельные ключи; Expo config plugins / bare | Лучше perf; два стека + web fallback |
| **C. Deep-link / внешнее приложение** (as-is banner) | Все | вне приложения | Нет ключа | Минимум работы; плохой in-app UX |
| **D. Оставить Google basemap** | Все (уже есть) | да | GCP | Default path; Яндекс не нужен |

---

## 2. Рекомендация spike

1. **Default prod:** Google interactive basemap (Phase 1) + Google Pollen (Phase 2) — уже в коде.  
2. **RU-premium flag** `EXPO_PUBLIC_YANDEX_MAP_INTERACTIVE` (default off):  
   - **Web + Expo Go path:** JS API 3.0 WebView (вариант A) с маркерами POI.  
   - **Later:** native SDK (B) если WebView latency/gestures недостаточны.  
3. **Не** использовать C как основной UX; deep-link — overflow/secondary.  
4. Ключ Яндекса: только server-side или remote config; **не** класть платный секрет в `EXPO_PUBLIC_*` без restrict.  
5. Pollen heatmap/forecast — **не** из Яндекса (нет публичного API).

---

## 3. Критерии решения (checklist)

- [x] Можно pan/zoom in-app (JS API 2.1 WebView / iframe) — **код готов**; staging smoke после ключа  
- [x] POI маркеры кликабельны (postMessage bridge → `onMarkerPress`)  
- [x] Offline: pollen snapshot кэш/календарь как раньше; без ключа/флага → Google / static Yandex widget  
- [x] Ключ не утекает в клиентский bundle — только `YANDEX_MAPS_JS_API_KEY` на API  
- [x] Нет запросов к HTML Яндекс Погоды allergies  
- [x] Feature flag выключает Яндекс → Google path  

---

## 4. Вне spike

- B2B pollen Яндекса (если появится договор — отдельный epic)  
- Замена wellness Open-Meteo  
- Парсинг UI Погоды  
- Native MapKit (вариант B)

---

## 5. Реализация (вариант A) — done in code

| Слой | Путь |
|------|------|
| API HTML embed | `apps/api/src/services/yandex-maps-embed.ts` · `GET /api/maps/yandex-interactive` |
| Mobile | `apps/mobile/src/components/YandexInteractiveMap.tsx` |
| Flag | `EXPO_PUBLIC_YANDEX_MAP_INTERACTIVE` + server `YANDEX_MAPS_INTERACTIVE_ENABLED` |
| Выбор basemap | `map.tsx`: Yandex interactive → Google → static Yandex widget |

**Включить на stage:**

```bash
export YANDEX_MAPS_JS_API_KEY=…   # developer.tech.yandex.ru — JS API
pnpm yc-stage-enable-yandex-maps  # Lockbox upsert + container remount
# then rebuild EAS staging (eas.json already has EXPO_PUBLIC_YANDEX_MAP_INTERACTIVE=true)
```

Smoke: `curl https://api.staging.aclearo.com/api/maps/yandex-status` → `interactive: true`; health `features.yandexMapsInteractive: true`.
