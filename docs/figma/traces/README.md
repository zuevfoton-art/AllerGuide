# 08 Traces — PNG-референс

Импортировать в Figma page **08 Traces** как **reference** (opacity ~30%, locked). Собирать векторные фреймы из page **02 Components**, не трассировать пиксель в пиксель.

Снято с HTML-зеркала [`docs/design-mockup.html`](../../design-mockup.html) (`?trace=1&screen=<id>`, только телефон 390×844) и [`kit.html`](../kit.html). Expo web (`localhost:5000`) — опциональный второй проход тех же сценариев, когда Metro поднят; HTML ближе к токенам пакета и не зависит от onboarding-гейта.

| Файл | Экран | Зачем дизайнеру |
|------|-------|-----------------|
| `kit.png` | library | Button / GlassCard / chips / TabBar+SOS |
| `home.png` | Сегодня default | полный home, не `3328:137` |
| `home-empty.png` | Сегодня empty | нет записей / пустые insights |
| `home-offline.png` | Сегодня offline | «нет данных», не ErrorState |
| `diary.png` | Журнал | CTA ряд + лента |
| `scanner.png` | Скан | вердикт первым |
| `map.png` | Карта | слои |
| `sos.png` | SOS с профилем | паспорт + 103 |
| `sos-empty.png` | SOS без профиля | звонок, не блокер |
| `settings.png` | Настройки | backup в ряд |
| `login.png` | Вход | phone/email |
| `register.png` | Регистрация | волна 4 |

Пересъём:

```bash
node docs/figma/capture-traces.mjs
```
