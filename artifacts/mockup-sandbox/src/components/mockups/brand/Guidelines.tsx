export function Guidelines() {
  return (
    <div className="min-h-screen bg-[#F4F6F9]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:wght@600;700&display=swap" />

      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-12 py-8">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <svg width="36" height="36" viewBox="0 0 44 44" fill="none">
              <rect width="44" height="44" rx="10" fill="#2563EB"/>
              <path d="M22 10L32 16V28L22 34L12 28V16L22 10Z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M17 22h10M22 17v10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 700, fontSize: 22, color: "#1E3A5F" }}>Aller<span style={{ color: "#2563EB", fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>Guide</span></span>
          </div>
          <div className="text-right">
            <div style={{ fontSize: 12, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Brandbook</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#1E3A5F" }}>Board 4</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>Гайдлайны бренда</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-12 py-10 space-y-12">

        {/* Brand Mission */}
        <section className="bg-gradient-to-r from-[#1E3A5F] to-[#2563EB] rounded-2xl p-10 text-white">
          <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>Миссия бренда</div>
          <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 30, fontWeight: 700, lineHeight: 1.2, marginBottom: 16 }}>
            «Сделать жизнь с аллергией безопасной, спокойной и свободной»
          </div>
          <div style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, maxWidth: 640 }}>
            AllerGuide — не медицинское приложение. Это надёжный спутник, который убирает тревогу и неопределённость из повседневного выбора продуктов, давая пользователю уверенность и комфорт.
          </div>
        </section>

        {/* Color usage rules */}
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1E3A5F", marginBottom: 20 }}>Правила использования цвета</h2>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1E3A5F", marginBottom: 12 }}>Иерархия применения</div>
              {[
                { role: "Primary #2563EB", use: "CTA-кнопки, активные вкладки, ссылки, иконка приложения", pct: "10%" },
                { role: "Navy #1E3A5F", use: "Заголовки, ключевые данные, header-блоки", pct: "15%" },
                { role: "Neutral #F4F6F9 / белый", use: "Фон экранов, карточки, поверхности", pct: "65%" },
                { role: "Danger #B91C1C", use: "Только для обнаруженных аллергенов и критических предупреждений", pct: "5%" },
                { role: "Success #15803D", use: "Только для безопасного результата и подтверждений", pct: "5%" },
              ].map((r) => (
                <div key={r.role} className="flex gap-3 mb-4">
                  <div style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: r.role.includes("#") ? r.role.split("#")[1].split(" ")[0].length === 6 ? `#${r.role.split("#")[1].split(" ")[0]}` : "#E2E8F0" : "#E2E8F0", flexShrink: 0, marginTop: 2, border: "1px solid #E2E8F0" }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1E3A5F" }}>{r.role} <span style={{ color: "#94A3B8", fontWeight: 400 }}>~{r.pct} площади</span></div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>{r.use}</div>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1E3A5F", marginBottom: 12 }}>Запрещено</div>
              <div className="space-y-3">
                {[
                  "Использовать danger/success в декоративных целях, не связанных с аллергией",
                  "Накладывать текст на градиент без проверки контрастности (мин. 4.5:1)",
                  "Использовать pure black (#000000) — только #0F172A или тона шкалы",
                  "Смешивать тёплые тона (оранжевый, жёлтый) с основной палитрой без системного обоснования",
                  "Применять opacity < 70% для текстовых элементов на светлом фоне",
                ].map((r, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span style={{ color: "#B91C1C", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✕</span>
                    <span style={{ fontSize: 12, color: "#475569" }}>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Typography rules */}
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1E3A5F", marginBottom: 20 }}>Типографические правила</h2>
          <div className="grid grid-cols-3 gap-5">
            {[
              {
                title: "Source Serif 4",
                subtitle: "Заголовки · Бренд",
                rules: [
                  "Только h1–h3 и display",
                  "Минимум 18px в интерфейсе",
                  "SemiBold 600 или Bold 700",
                  "Не использовать для body и UI-меток",
                  "На тёмном фоне: white или slate-200",
                ],
                sample: "Ваш аллергический профиль",
                sampleFont: "'Source Serif 4', serif",
                sampleSize: 20,
              },
              {
                title: "Inter",
                subtitle: "Интерфейс · Тело текста",
                rules: [
                  "body: 15px Regular",
                  "label: 12px SemiBold UPPERCASE",
                  "caption: 11px Regular — минимум",
                  "Кнопки: 15px SemiBold",
                  "Не использовать Regular < 13px",
                ],
                sample: "Сканируйте штрихкод или введите название продукта",
                sampleFont: "'Inter', sans-serif",
                sampleSize: 15,
              },
              {
                title: "Интервалы",
                subtitle: "Line-height · Letter-spacing",
                rules: [
                  "Заголовки: line-height 1.1–1.3",
                  "Тело: line-height 1.5–1.6",
                  "Caption: line-height 1.4",
                  "Labels: letter-spacing 0.08–0.15em",
                  "Параграфы: max-width 65ch",
                ],
                sample: "Аллергия · Профиль · История · SOS",
                sampleFont: "'Inter', sans-serif",
                sampleSize: 12,
                sampleStyle: { letterSpacing: "0.12em", textTransform: "uppercase" as const, fontWeight: 600 },
              },
            ].map((t) => (
              <div key={t.title} className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <div style={{ backgroundColor: "#1E3A5F", padding: "14px 16px" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: "#60A5FA" }}>{t.subtitle}</div>
                </div>
                <div style={{ padding: 16 }}>
                  <div className="space-y-2 mb-5">
                    {t.rules.map((r, i) => (
                      <div key={i} className="flex gap-2">
                        <span style={{ color: "#2563EB", fontWeight: 700, flexShrink: 0 }}>·</span>
                        <span style={{ fontSize: 11, color: "#475569" }}>{r}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: "1px solid #F4F6F9", paddingTop: 12, fontFamily: t.sampleFont, fontSize: t.sampleSize, color: "#1E3A5F", lineHeight: 1.4, ...(t.sampleStyle || {}) }}>
                    {t.sample}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Voice & Tone */}
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1E3A5F", marginBottom: 20 }}>Голос и тон бренда</h2>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { word: "Точный", desc: "Факты без лишнего. Данные говорят сами." },
                  { word: "Спокойный", desc: "Без паники. Информируем, не пугаем." },
                  { word: "Заботливый", desc: "Думаем о безопасности пользователя." },
                  { word: "Чёткий", desc: "Короткие предложения. Ясная структура." },
                ].map((v) => (
                  <div key={v.word} className="bg-white rounded-xl border border-[#E2E8F0] p-4">
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#2563EB", marginBottom: 4 }}>{v.word}</div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>{v.desc}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
                <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Таблица тона</div>
                <table style={{ width: "100%", fontSize: 11 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", color: "#94A3B8", paddingBottom: 8, fontWeight: 600 }}>Контекст</th>
                      <th style={{ textAlign: "left", color: "#94A3B8", paddingBottom: 8, fontWeight: 600 }}>Тон</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Обнаружен аллерген", "Прямой, срочный, без паники"],
                      ["Продукт безопасен", "Спокойный, подтверждающий"],
                      ["Ошибка / сбой", "Честный, конструктивный"],
                      ["Онбординг", "Дружелюбный, направляющий"],
                      ["Пустой экран", "Мотивирующий, лёгкий"],
                      ["SOS-карта", "Краткий, медицинский, формальный"],
                    ].map(([ctx, tone], i) => (
                      <tr key={i} style={{ borderTop: "1px solid #F4F6F9" }}>
                        <td style={{ padding: "7px 0", color: "#1E3A5F", fontWeight: 500 }}>{ctx}</td>
                        <td style={{ padding: "7px 0", color: "#64748B" }}>{tone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <div style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Примеры копирайтинга</div>
              {[
                {
                  label: "Headline (маркетинг)",
                  good: "Состав за 1 секунду. Без догадок.",
                  bad: "Лучшее приложение для проверки аллергенов в мире!",
                },
                {
                  label: "Онбординг",
                  good: "Укажите аллергены — AllerGuide будет проверять каждый продукт автоматически.",
                  bad: "Добро пожаловать в наше замечательное приложение AllerGuide!",
                },
                {
                  label: "Ошибка",
                  good: "Не удалось загрузить данные. Проверьте соединение и повторите.",
                  bad: "Упс! Что-то пошло совсем не так, попробуйте ещё разочек :)",
                },
                {
                  label: "Пустой экран",
                  good: "Нет сканирований. Сфотографируйте этикетку — результат за секунду.",
                  bad: "Здесь пока ничего нет. Скоро будет! Мы работаем.",
                },
                {
                  label: "CTA",
                  good: "Проверить состав",
                  bad: "Нажмите здесь, чтобы узнать больше",
                },
              ].map((ex) => (
                <div key={ex.label} className="bg-white rounded-xl border border-[#E2E8F0] p-4">
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{ex.label}</div>
                  <div className="flex gap-2 mb-2">
                    <span style={{ color: "#15803D", fontWeight: 700, flexShrink: 0, fontSize: 12 }}>✓</span>
                    <span style={{ fontSize: 12, color: "#1E3A5F" }}>{ex.good}</span>
                  </div>
                  <div className="flex gap-2">
                    <span style={{ color: "#B91C1C", fontWeight: 700, flexShrink: 0, fontSize: 12 }}>✕</span>
                    <span style={{ fontSize: 12, color: "#94A3B8" }}>{ex.bad}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Spacing & Components */}
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1E3A5F", marginBottom: 20 }}>Компоненты и расстояния</h2>
          <div className="grid grid-cols-3 gap-6">
            {/* Spacing */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1E3A5F", marginBottom: 14 }}>Сетка отступов</div>
              <div className="space-y-3">
                {[
                  { token: "space-1", px: "4px", use: "Внутри компонента" },
                  { token: "space-2", px: "8px", use: "Gap иконок, меток" },
                  { token: "space-3", px: "12px", use: "Padding карточек (sm)" },
                  { token: "space-4", px: "16px", use: "Стандартный padding" },
                  { token: "space-6", px: "24px", use: "Секции внутри карточки" },
                  { token: "space-8", px: "32px", use: "Между секциями экрана" },
                  { token: "space-12", px: "48px", use: "Горизонтальные поля" },
                ].map((s) => (
                  <div key={s.token} className="flex items-center gap-3">
                    <div style={{ width: parseInt(s.px) * 1.5, height: 8, backgroundColor: "#BFDBFE", borderRadius: 2, flexShrink: 0 }} />
                    <div>
                      <span style={{ fontSize: 10, fontFamily: "monospace", color: "#2563EB", fontWeight: 600 }}>{s.px}</span>
                      <span style={{ fontSize: 10, color: "#94A3B8", marginLeft: 6 }}>{s.use}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Border radius */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1E3A5F", marginBottom: 14 }}>Радиусы скругления</div>
              <div className="space-y-4">
                {[
                  { name: "radius-sm", px: "6px", use: "Теги, метки, баджи" },
                  { name: "radius-md", px: "8px", use: "Кнопки, input-поля, небольшие карточки" },
                  { name: "radius-lg", px: "12px", use: "Карточки, модальные окна" },
                  { name: "radius-xl", px: "16px", use: "Листы, крупные панели" },
                  { name: "radius-full", px: "9999px", use: "Pill-теги, аватары" },
                ].map((r) => (
                  <div key={r.name} className="flex items-center gap-4">
                    <div style={{ width: 36, height: 24, backgroundColor: "#EFF4FF", border: "2px solid #2563EB", borderRadius: r.px === "9999px" ? 9999 : parseInt(r.px), flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#1E3A5F" }}>{r.px}</div>
                      <div style={{ fontSize: 10, color: "#94A3B8" }}>{r.use}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Buttons & interactive */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-5">
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1E3A5F", marginBottom: 14 }}>Интерактивные элементы</div>
              <div className="space-y-3">
                <div style={{ backgroundColor: "#2563EB", color: "white", fontSize: 14, fontWeight: 600, textAlign: "center", padding: "12px 16px", borderRadius: 8 }}>Основная кнопка</div>
                <div style={{ backgroundColor: "white", color: "#2563EB", fontSize: 14, fontWeight: 600, textAlign: "center", padding: "11px 16px", borderRadius: 8, border: "1.5px solid #2563EB" }}>Вторичная кнопка</div>
                <div style={{ backgroundColor: "white", color: "#475569", fontSize: 14, padding: "11px 16px", borderRadius: 8, border: "1px solid #E2E8F0" }}>Поле ввода</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  <span style={{ backgroundColor: "#FEF2F2", color: "#B91C1C", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99 }}>Глютен</span>
                  <span style={{ backgroundColor: "#F0FDF4", color: "#15803D", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99 }}>Безопасно</span>
                  <span style={{ backgroundColor: "#EFF4FF", color: "#2563EB", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99 }}>Новый</span>
                </div>
                <div className="pt-3 border-t border-[#F4F6F9]">
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>Min touch target: 44 × 44px (iOS) · 48 × 48dp (Android)</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Accessibility */}
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1E3A5F", marginBottom: 20 }}>Стандарты доступности</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1E3A5F", marginBottom: 14 }}>Контрастность и цвет</div>
              <div className="space-y-3">
                {[
                  { rule: "WCAG 2.2 AA", detail: "Мин. 4.5:1 для обычного текста, 3:1 для крупного (18px+ или 14px+ Bold)" },
                  { rule: "Не только цвет", detail: "Аллергены помечаются иконкой И цветом — не только цветом" },
                  { rule: "Фокус-состояние", detail: "Видимый outline 2px #2563EB на всех интерактивных элементах" },
                  { rule: "Тёмная тема", detail: "Accent #3B82F6 (вместо #2563EB) — скорректирован для contrast на тёмном фоне" },
                ].map((r) => (
                  <div key={r.rule} className="flex gap-3">
                    <span style={{ color: "#15803D", fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1E3A5F" }}>{r.rule}:</span>
                      <span style={{ fontSize: 12, color: "#64748B", marginLeft: 4 }}>{r.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1E3A5F", marginBottom: 14 }}>Размеры и взаимодействие</div>
              <div className="space-y-3">
                {[
                  { rule: "Минимальный шрифт", detail: "Body: 15px web / 14px mobile. Caption: не менее 11px" },
                  { rule: "Touch targets", detail: "Все интерактивные зоны ≥ 44×44px (iOS) / 48×48dp (Android)" },
                  { rule: "Анимации", detail: "prefers-reduced-motion: декоративные анимации отключаются, функциональные — заменяются мгновенным переходом" },
                  { rule: "Иконки", detail: "Все branded-иконки читаемы при 24px. Не используют только цвет для передачи смысла" },
                  { rule: "Алерты", detail: "Критические уведомления (аллерген!) дублируются заголовком/текстом, не только иконкой" },
                ].map((r) => (
                  <div key={r.rule} className="flex gap-3">
                    <span style={{ color: "#15803D", fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1E3A5F" }}>{r.rule}:</span>
                      <span style={{ fontSize: 12, color: "#64748B", marginLeft: 4 }}>{r.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Summary */}
        <section className="bg-white rounded-2xl border border-[#E2E8F0] p-8">
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>Брендбук AllerGuide · Сводка</div>
          <div className="grid grid-cols-4 gap-6">
            {[
              { label: "Основной шрифт", val: "Source Serif 4 + Inter" },
              { label: "Primary цвет", val: "#2563EB · oklch(51% .18 250)" },
              { label: "Фон", val: "#F4F6F9 · клинически чистый" },
              { label: "Радиус", val: "6–16px · без острых углов" },
              { label: "Голос", val: "Точный · спокойный · краткий" },
              { label: "Настроение", val: "Clinical Calm · минималистичный" },
              { label: "Ориентация", val: "Mobile-first · соцсети" },
              { label: "Доступность", val: "WCAG 2.2 AA · min 44px targets" },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1E3A5F" }}>{s.val}</div>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-[#E2E8F0] pt-6 flex justify-between items-center">
          <span style={{ fontSize: 11, color: "#94A3B8" }}>AllerGuide Brandbook 2025 · Board 4 of 4</span>
          <span style={{ fontSize: 11, color: "#2563EB", fontWeight: 600 }}>Гайдлайны бренда</span>
        </footer>
      </div>
    </div>
  );
}
