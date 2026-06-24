export function Logo() {
  return (
    <div className="min-h-screen bg-[#F4F6F9]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:wght@600;700&display=swap" />

      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-12 py-8">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div>
            <span style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 700, fontSize: 28, color: "#1E3A5F" }}>Aller</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 28, color: "#2563EB" }}>Guide</span>
          </div>
          <div className="text-right">
            <div style={{ fontSize: 12, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Brandbook</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#1E3A5F" }}>Board 2</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>Логотип и иконка</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-12 py-10 space-y-12">

        {/* Primary logo — light bg */}
        <section>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>Основной логотип · Светлый фон</div>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 flex items-center justify-around gap-8">
            {/* Full horizontal */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <rect width="44" height="44" rx="10" fill="#2563EB"/>
                  <path d="M22 10L32 16V28L22 34L12 28V16L22 10Z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M17 22h10M22 17v10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                <div>
                  <div style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 700, fontSize: 26, color: "#1E3A5F", lineHeight: 1 }}>Aller<span style={{ color: "#2563EB", fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>Guide</span></div>
                  <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#94A3B8", marginTop: 2 }}>ALLERGY MANAGEMENT</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>Горизонтальный · основной</div>
            </div>

            {/* Compact wordmark */}
            <div className="flex flex-col items-center gap-4">
              <div>
                <div style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 700, fontSize: 32, color: "#1E3A5F", lineHeight: 1 }}>Aller</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 32, color: "#2563EB", lineHeight: 1 }}>Guide</div>
              </div>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>Wordmark · стэк</div>
            </div>

            {/* Icon only */}
            <div className="flex flex-col items-center gap-4">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <rect width="64" height="64" rx="14" fill="#2563EB"/>
                <path d="M32 13L46 21V43L32 51L18 43V21L32 13Z" fill="none" stroke="white" strokeWidth="2.5" strokeLinejoin="round"/>
                <path d="M24 32h16M32 24v16" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>Icon-only · квадрат</div>
            </div>

            {/* Monogram */}
            <div className="flex flex-col items-center gap-4">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <rect width="64" height="64" rx="14" fill="#1E3A5F"/>
                <text x="32" y="44" textAnchor="middle" fill="white" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 28 }}>AG</text>
              </svg>
              <div style={{ fontSize: 11, color: "#94A3B8" }}>Монограмма</div>
            </div>
          </div>
        </section>

        {/* Dark background */}
        <section>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>Тёмный фон</div>
          <div className="rounded-2xl p-12 flex items-center justify-around gap-8" style={{ backgroundColor: "#0B1120" }}>
            {/* Full horizontal dark */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <rect width="44" height="44" rx="10" fill="#3B82F6"/>
                  <path d="M22 10L32 16V28L22 34L12 28V16L22 10Z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M17 22h10M22 17v10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                <div>
                  <div style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 700, fontSize: 26, color: "#E2E8F0", lineHeight: 1 }}>Aller<span style={{ color: "#60A5FA", fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>Guide</span></div>
                  <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#475569", marginTop: 2 }}>ALLERGY MANAGEMENT</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#475569" }}>Горизонтальный · тёмный</div>
            </div>

            {/* White monochrome */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <rect width="44" height="44" rx="10" fill="white" fillOpacity="0.1"/>
                  <path d="M22 10L32 16V28L22 34L12 28V16L22 10Z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M17 22h10M22 17v10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                <div>
                  <div style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 700, fontSize: 26, color: "white", lineHeight: 1 }}>Aller<span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>Guide</span></div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#475569" }}>Монохромный · белый</div>
            </div>

            {/* Icon dark */}
            <div className="flex flex-col items-center gap-4">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <rect width="64" height="64" rx="14" fill="#3B82F6"/>
                <path d="M32 13L46 21V43L32 51L18 43V21L32 13Z" fill="none" stroke="white" strokeWidth="2.5" strokeLinejoin="round"/>
                <path d="M24 32h16M32 24v16" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              <div style={{ fontSize: 11, color: "#475569" }}>Icon · тёмный</div>
            </div>
          </div>
        </section>

        {/* Favicon / App icon sizes */}
        <section>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>Тест масштабируемости · App Icon</div>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 flex items-end justify-around">
            {[
              { size: 16, label: "16px · favicon" },
              { size: 24, label: "24px" },
              { size: 32, label: "32px · small icon" },
              { size: 48, label: "48px" },
              { size: 64, label: "64px" },
              { size: 96, label: "96px" },
              { size: 128, label: "128px · App Store" },
            ].map(({ size, label }) => (
              <div key={size} className="flex flex-col items-center gap-3">
                <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
                  <rect width="64" height="64" rx={size < 24 ? 8 : 14} fill="#2563EB"/>
                  {size >= 24 ? (
                    <>
                      <path d="M32 13L46 21V43L32 51L18 43V21L32 13Z" fill="none" stroke="white" strokeWidth="2.5" strokeLinejoin="round"/>
                      <path d="M24 32h16M32 24v16" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    </>
                  ) : (
                    <path d="M24 32h16M32 24v16" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                  )}
                </svg>
                <div style={{ fontSize: 9, color: "#94A3B8", textAlign: "center" }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Rounded square for stores */}
        <section>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>App Store / Социальные профили</div>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 flex items-center justify-around gap-12">
            {/* iOS App Icon */}
            <div className="flex flex-col items-center gap-4">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                <rect width="120" height="120" rx="27" fill="#2563EB"/>
                <path d="M60 24L86 39V81L60 96L34 81V39L60 24Z" fill="none" stroke="white" strokeWidth="4" strokeLinejoin="round"/>
                <path d="M44 60h32M60 44v32" stroke="white" strokeWidth="5" strokeLinecap="round"/>
              </svg>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>iOS App Icon</div>
              <div style={{ fontSize: 10, color: "#94A3B8" }}>1024 × 1024 · iOS radius</div>
            </div>

            {/* Instagram Profile */}
            <div className="flex flex-col items-center gap-4">
              <div style={{ borderRadius: "50%", overflow: "hidden", width: 120, height: 120, border: "3px solid #E2E8F0" }}>
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                  <rect width="120" height="120" fill="#2563EB"/>
                  <path d="M60 24L86 39V81L60 96L34 81V39L60 24Z" fill="none" stroke="white" strokeWidth="4" strokeLinejoin="round"/>
                  <path d="M44 60h32M60 44v32" stroke="white" strokeWidth="5" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>Профиль соцсетей</div>
              <div style={{ fontSize: 10, color: "#94A3B8" }}>Круглый · 320 × 320</div>
            </div>

            {/* Android Adaptive */}
            <div className="flex flex-col items-center gap-4">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                <rect width="120" height="120" rx="24" fill="#EFF4FF"/>
                <rect x="20" y="20" width="80" height="80" rx="18" fill="#2563EB"/>
                <path d="M60 32L78 42V62L60 72L42 62V42L60 32Z" fill="none" stroke="white" strokeWidth="3" strokeLinejoin="round"/>
                <path d="M50 52h20M60 42v20" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
              </svg>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>Android Adaptive</div>
              <div style={{ fontSize: 10, color: "#94A3B8" }}>Foreground + background layers</div>
            </div>

            {/* Single color */}
            <div className="flex flex-col items-center gap-4">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                <rect width="120" height="120" rx="27" fill="#E2E8F0"/>
                <path d="M60 24L86 39V81L60 96L34 81V39L60 24Z" fill="none" stroke="#1E3A5F" strokeWidth="4" strokeLinejoin="round"/>
                <path d="M44 60h32M60 44v32" stroke="#1E3A5F" strokeWidth="5" strokeLinecap="round"/>
              </svg>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>Монохромный</div>
              <div style={{ fontSize: 10, color: "#94A3B8" }}>Печать / тиснение</div>
            </div>
          </div>
        </section>

        {/* Construction rules */}
        <section>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Правила использования</div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { ok: true, title: "Правильно", desc: "Используйте только утверждённые варианты логотипа на контрастных фонах" },
              { ok: false, title: "Нельзя менять цвет", desc: "Не перекрашивайте логотип в произвольные цвета вне палитры бренда" },
              { ok: false, title: "Нельзя деформировать", desc: "Не растягивайте, не сжимайте и не наклоняйте логотип" },
            ].map((r, i) => (
              <div key={i} className="rounded-xl p-5 border" style={{ borderColor: r.ok ? "#BFDBFE" : "#FECACA", backgroundColor: r.ok ? "#EFF4FF" : "#FEF2F2" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: r.ok ? "#2563EB" : "#B91C1C", marginBottom: 6 }}>
                  {r.ok ? "✓" : "✕"} {r.title}
                </div>
                <div style={{ fontSize: 12, color: "#475569" }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* SVG source */}
        <section>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>SVG — Исходник для экспорта</div>
          <div className="bg-[#0F172A] rounded-xl p-5">
            <pre style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.7 }}>{`<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Shield outline -->
  <rect width="44" height="44" rx="10" fill="#2563EB"/>
  <path d="M22 10L32 16V28L22 34L12 28V16L22 10Z"
        fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/>
  <!-- Cross / plus -->
  <path d="M17 22h10M22 17v10"
        stroke="white" stroke-width="2.5" stroke-linecap="round"/>
</svg>`}</pre>
          </div>
        </section>

        <footer className="border-t border-[#E2E8F0] pt-6 flex justify-between items-center">
          <span style={{ fontSize: 11, color: "#94A3B8" }}>AllerGuide Brandbook 2025 · Board 2 of 4</span>
          <span style={{ fontSize: 11, color: "#2563EB", fontWeight: 600 }}>Логотип и иконка</span>
        </footer>
      </div>
    </div>
  );
}
