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

- [ ] Можно pan/zoom in-app на Android staging  
- [ ] POI маркеры кликабельны  
- [ ] Offline: fallback на кэш snapshot + статичная/последняя подложка или Google  
- [ ] Ключ не утекает в клиентский bundle без restrict  
- [ ] Нет запросов к HTML Яндекс Погоды allergies  
- [ ] Feature flag выключает Яндекс → Google path без регрессий  

---

## 4. Вне spike

- B2B pollen Яндекса (если появится договор — отдельный epic)  
- Замена wellness Open-Meteo  
- Парсинг UI Погоды  

---

## 5. Следующий PR после spike

Если A ок: тонкий `YandexInteractiveMap` + флаг; `map.tsx` выбирает Google vs Yandex basemap; pollen/plume остаются Google.  
Если A нет: закрыть Phase 4 как «Google-only» и оставить deep-link secondary.
