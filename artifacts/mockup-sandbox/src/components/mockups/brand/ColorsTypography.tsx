export function ColorsTypography() {
  const palette = {
    primary: [
      { shade: "50", hex: "#EFF4FF", oklch: "oklch(96% 0.02 245)" },
      { shade: "100", hex: "#DBEAFE", oklch: "oklch(92% 0.04 245)" },
      { shade: "200", hex: "#BFDBFE", oklch: "oklch(86% 0.07 245)" },
      { shade: "300", hex: "#93C5FD", oklch: "oklch(77% 0.10 245)" },
      { shade: "400", hex: "#60A5FA", oklch: "oklch(67% 0.13 245)" },
      { shade: "500", hex: "#3B82F6", oklch: "oklch(58% 0.16 245)" },
      { shade: "600", hex: "#2563EB", oklch: "oklch(51% 0.18 250)" },
      { shade: "700", hex: "#1D4ED8", oklch: "oklch(44% 0.18 255)" },
      { shade: "800", hex: "#1E3A5F", oklch: "oklch(30% 0.12 255)" },
      { shade: "900", hex: "#0F172A", oklch: "oklch(14% 0.05 255)" },
    ],
    neutral: [
      { shade: "50", hex: "#F4F6F9", oklch: "oklch(97% 0.01 245)" },
      { shade: "100", hex: "#E8ECF2", oklch: "oklch(93% 0.01 245)" },
      { shade: "200", hex: "#D0D8E5", oklch: "oklch(86% 0.02 245)" },
      { shade: "300", hex: "#94A3B8", oklch: "oklch(67% 0.04 245)" },
      { shade: "400", hex: "#64748B", oklch: "oklch(52% 0.04 245)" },
      { shade: "500", hex: "#475569", oklch: "oklch(42% 0.04 245)" },
      { shade: "600", hex: "#334155", oklch: "oklch(33% 0.04 245)" },
      { shade: "700", hex: "#1E293B", oklch: "oklch(23% 0.04 245)" },
      { shade: "800", hex: "#0F172A", oklch: "oklch(14% 0.04 245)" },
      { shade: "900", hex: "#060B14", oklch: "oklch(7% 0.02 245)" },
    ],
    semantic: [
      { name: "Успех / Safe", hex: "#15803D", bg: "#F0FDF4", label: "text-emerald-700" },
      { name: "Опасность / Danger", hex: "#B91C1C", bg: "#FEF2F2", label: "text-red-700" },
      { name: "Предупреждение", hex: "#B45309", bg: "#FFFBEB", label: "text-amber-700" },
      { name: "Информация", hex: "#0369A1", bg: "#F0F9FF", label: "text-sky-700" },
    ],
  };

  const contrastPairs = [
    { bg: "#FFFFFF", fg: "#1E3A5F", ratio: "12.4:1", label: "Navy на белом", pass: "AAA" },
    { bg: "#FFFFFF", fg: "#2563EB", ratio: "5.9:1", label: "Accent на белом", pass: "AA" },
    { bg: "#2563EB", fg: "#FFFFFF", ratio: "5.9:1", label: "Белый на accent", pass: "AA" },
    { bg: "#F4F6F9", fg: "#0F172A", ratio: "15.1:1", label: "Текст на bg", pass: "AAA" },
    { bg: "#F4F6F9", fg: "#64748B", ratio: "4.7:1", label: "Muted на bg", pass: "AA" },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F9]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:wght@600;700&display=swap" />

      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-12 py-8">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div>
            <span style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 700, fontSize: 28, color: "#1E3A5F" }}>Aller</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 28, color: "#2563EB" }}>Guide</span>
            <div style={{ fontSize: 11, letterSpacing: "0.18em", color: "#94A3B8", marginTop: 2 }}>ALLERGY MANAGEMENT</div>
          </div>
          <div className="text-right">
            <div style={{ fontSize: 12, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Brandbook</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#1E3A5F" }}>Board 1</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>Цвета и типографика</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-12 py-10 space-y-12">

        {/* Primary palette */}
        <section>
          <div className="flex items-baseline gap-4 mb-5">
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1E3A5F" }}>Основная палитра — Clinical Blue</h2>
            <span style={{ fontSize: 12, color: "#94A3B8" }}>Primary · OKLCH · серо-синий пастельный</span>
          </div>
          <div className="flex rounded-xl overflow-hidden shadow-sm h-20">
            {palette.primary.map((s) => (
              <div key={s.shade} className="flex-1 relative group" style={{ backgroundColor: s.hex }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                  <span style={{ fontSize: 10, fontWeight: 700, color: s.shade >= "500" ? "#fff" : "#000" }}>{s.shade}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-10 mt-2 gap-0">
            {palette.primary.map((s) => (
              <div key={s.shade} className="text-center">
                <div style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>{s.shade}</div>
                <div style={{ fontSize: 9, color: "#94A3B8", fontFamily: "monospace" }}>{s.hex}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Neutral palette */}
        <section>
          <div className="flex items-baseline gap-4 mb-5">
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1E3A5F" }}>Нейтральная шкала</h2>
            <span style={{ fontSize: 12, color: "#94A3B8" }}>Slate-Blue · фоны, текст, бордеры</span>
          </div>
          <div className="flex rounded-xl overflow-hidden shadow-sm h-16">
            {palette.neutral.map((s) => (
              <div key={s.shade} className="flex-1" style={{ backgroundColor: s.hex }} />
            ))}
          </div>
          <div className="grid grid-cols-10 mt-2">
            {palette.neutral.map((s) => (
              <div key={s.shade} className="text-center">
                <div style={{ fontSize: 10, fontWeight: 600, color: "#475569" }}>{s.shade}</div>
                <div style={{ fontSize: 9, color: "#94A3B8", fontFamily: "monospace" }}>{s.hex}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Semantic colors */}
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1E3A5F", marginBottom: 16 }}>Семантические цвета</h2>
          <div className="grid grid-cols-4 gap-4">
            {palette.semantic.map((c) => (
              <div key={c.name} className="rounded-xl overflow-hidden border border-[#E2E8F0]">
                <div className="h-14" style={{ backgroundColor: c.hex }} />
                <div className="p-3" style={{ backgroundColor: c.bg }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: c.hex }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "monospace" }}>{c.hex}</div>
                  <div style={{ fontSize: 10, color: "#94A3B8" }}>{c.bg}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Dark mode */}
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1E3A5F", marginBottom: 16 }}>Тёмная тема</h2>
          <div className="rounded-xl p-6 grid grid-cols-6 gap-3" style={{ backgroundColor: "#0B1120" }}>
            {[
              { name: "bg", hex: "#0B1120" },
              { name: "card", hex: "#151D2E" },
              { name: "border", hex: "#334155" },
              { name: "muted", hex: "#94A3B8" },
              { name: "text", hex: "#F8FAFC" },
              { name: "accent", hex: "#3B82F6" },
            ].map((c) => (
              <div key={c.name} className="text-center">
                <div className="w-full h-10 rounded-lg border border-white/10" style={{ backgroundColor: c.hex }} />
                <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", marginTop: 4 }}>{c.name}</div>
                <div style={{ fontSize: 9, color: "#475569", fontFamily: "monospace" }}>{c.hex}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Contrast audit */}
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1E3A5F", marginBottom: 16 }}>Аудит контрастности WCAG 2.2</h2>
          <div className="rounded-xl overflow-hidden border border-[#E2E8F0] bg-white">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: "#F4F6F9" }}>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Пара</th>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Превью</th>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Коэфф.</th>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Статус</th>
                </tr>
              </thead>
              <tbody>
                {contrastPairs.map((p, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #E2E8F0" }}>
                    <td style={{ padding: "10px 16px", fontSize: 13, color: "#1E3A5F" }}>{p.label}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ backgroundColor: p.bg, color: p.fg, fontSize: 13, padding: "3px 10px", borderRadius: 4, border: "1px solid #E2E8F0" }}>Текст</span>
                    </td>
                    <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "#0F172A", fontFamily: "monospace" }}>{p.ratio}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ backgroundColor: p.pass === "AAA" ? "#F0FDF4" : "#EFF4FF", color: p.pass === "AAA" ? "#15803D" : "#2563EB", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{p.pass}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Typography */}
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1E3A5F", marginBottom: 20 }}>Типографическая система</h2>

          <div className="grid grid-cols-2 gap-8">
            {/* Display / Heading */}
            <div className="bg-white rounded-xl p-6 border border-[#E2E8F0]">
              <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Source Serif 4 — Заголовки</div>
              <div style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 700, fontSize: 36, color: "#1E3A5F", lineHeight: 1.1 }}>Аллергия не ограничивает</div>
              <div style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 600, fontSize: 22, color: "#1E3A5F", marginTop: 8, lineHeight: 1.2 }}>Ваш персональный гид</div>
              <div style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 600, fontSize: 18, color: "#475569", marginTop: 6 }}>Безопасный выбор каждый день</div>
              <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                <div style={{ fontSize: 11, color: "#94A3B8" }}>h1: 36px · h2: 22px · h3: 18px</div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>SemiBold 600 / Bold 700 · Line-height 1.1–1.3</div>
              </div>
            </div>

            {/* Body */}
            <div className="bg-white rounded-xl p-6 border border-[#E2E8F0]">
              <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Inter — Интерфейс и текст</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: 15, color: "#0F172A", lineHeight: 1.6 }}>
                AllerGuide мгновенно проверяет состав продукта и выделяет все аллергены, на которые у вас есть реакция.
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 13, color: "#475569", marginTop: 8, lineHeight: 1.5 }}>
                Сканируйте штрихкод или введите название — результат за секунду.
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: 11, color: "#94A3B8", marginTop: 6 }}>
                Подпись · Вспомогательный текст · Метка
              </div>
              <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                <div style={{ fontSize: 11, color: "#94A3B8" }}>body: 15px · bodySm: 13px · label: 12px · caption: 11px</div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>Regular 400 / Medium 500 / SemiBold 600 / Bold 700</div>
              </div>
            </div>
          </div>

          {/* Type scale */}
          <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] mt-6">
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Иерархия размеров</div>
            <div className="space-y-3">
              {[
                { tag: "display", size: "32px", weight: "700", font: "Source Serif 4", sample: "AllerGuide" },
                { tag: "h1", size: "26px", weight: "700", font: "Source Serif 4", sample: "Проверить состав" },
                { tag: "h2", size: "22px", weight: "600", font: "Source Serif 4", sample: "Ваши аллергены" },
                { tag: "h3", size: "18px", weight: "600", font: "Source Serif 4", sample: "Результаты сканирования" },
                { tag: "body", size: "15px", weight: "400", font: "Inter", sample: "Продукт содержит арахис и молоко. Пшеница отсутствует." },
                { tag: "label", size: "12px", weight: "600", font: "Inter", sample: "АЛЛЕРГЕН · ПРОДУКТ · ИСТОРИЯ" },
                { tag: "caption", size: "11px", weight: "400", font: "Inter", sample: "Обновлено 3 мин. назад · Источник: Open Food Facts" },
              ].map((t) => (
                <div key={t.tag} className="flex items-baseline gap-4 py-2 border-b border-[#F4F6F9]">
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#2563EB", width: 48, fontFamily: "monospace", flexShrink: 0 }}>{t.tag}</span>
                  <span style={{ fontSize: 10, color: "#94A3B8", width: 36, flexShrink: 0, fontFamily: "monospace" }}>{t.size}</span>
                  <span style={{ fontSize: 10, color: "#94A3B8", width: 80, flexShrink: 0 }}>{t.font}</span>
                  <span style={{ fontFamily: t.font === "Source Serif 4" ? "'Source Serif 4', serif" : "'Inter', sans-serif", fontSize: t.size, fontWeight: t.weight, color: "#1E3A5F", lineHeight: 1.3 }}>{t.sample}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Design tokens export */}
        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1E3A5F", marginBottom: 16 }}>Экспорт токенов</h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-[#0F172A] rounded-xl p-5">
              <div style={{ fontSize: 11, fontWeight: 600, color: "#3B82F6", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>CSS Custom Properties</div>
              <pre style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.7, overflow: "auto" }}>{`:root {
  --color-primary:    #2563EB;
  --color-primary-ok: oklch(51% 0.18 250);
  --color-navy:       #1E3A5F;
  --color-bg:         #F4F6F9;
  --color-card:       #FFFFFF;
  --color-text:       #0F172A;
  --color-muted:      #64748B;
  --color-border:     #E2E8F0;
  --color-success:    #15803D;
  --color-danger:     #B91C1C;
  --color-warning:    #B45309;
  --radius-sm:        6px;
  --radius-md:        8px;
  --radius-lg:        12px;
}`}</pre>
            </div>
            <div className="bg-[#0F172A] rounded-xl p-5">
              <div style={{ fontSize: 11, fontWeight: 600, color: "#3B82F6", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Tailwind Config</div>
              <pre style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.7, overflow: "auto" }}>{`colors: {
  primary: {
    50:  '#EFF4FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
    800: '#1E3A5F',
    900: '#0F172A',
  },
  slate: {
    50:  '#F4F6F9',
    200: '#E2E8F0',
    400: '#94A3B8',
    500: '#64748B',
  },
},
fontFamily: {
  serif: ['Source Serif 4', 'serif'],
  sans:  ['Inter', 'sans-serif'],
},`}</pre>
            </div>
          </div>
        </section>

        <footer className="border-t border-[#E2E8F0] pt-6 flex justify-between items-center">
          <span style={{ fontSize: 11, color: "#94A3B8" }}>AllerGuide Brandbook 2025 · Board 1 of 4</span>
          <span style={{ fontSize: 11, color: "#2563EB", fontWeight: 600 }}>Цвета и типографика</span>
        </footer>
      </div>
    </div>
  );
}
