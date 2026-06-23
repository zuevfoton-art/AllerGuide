export function BrandInAction() {
  const allergens = ["Глютен", "Молоко", "Арахис", "Яйца", "Соя"];
  const safeAllergens = ["Кунжут", "Рыба", "Морепродукты"];

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
            <div style={{ fontSize: 22, fontWeight: 700, color: "#1E3A5F" }}>Board 3</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>Бренд в действии</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-12 py-10 space-y-12">

        {/* Social Media Post */}
        <section>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>Instagram Post · 1080 × 1080</div>
          <div className="flex gap-8">
            {/* Post variant 1 — scan result */}
            <div style={{ width: 320, height: 320, borderRadius: 16, overflow: "hidden", flexShrink: 0, position: "relative", backgroundColor: "#0B1120" }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1E3A5F 0%, #0B1120 100%)" }} />
              <div style={{ position: "relative", zIndex: 1, padding: 28, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div className="flex items-center gap-2">
                  <svg width="28" height="28" viewBox="0 0 44 44" fill="none">
                    <rect width="44" height="44" rx="10" fill="#3B82F6"/>
                    <path d="M22 10L32 16V28L22 34L12 28V16L22 10Z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M17 22h10M22 17v10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  <span style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 700, fontSize: 18, color: "white" }}>Aller<span style={{ color: "#60A5FA", fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>Guide</span></span>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#475569", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>Результат сканирования</div>
                  <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 26, fontWeight: 700, color: "white", lineHeight: 1.2, marginBottom: 12 }}>Шоколадный батончик Alpen Gold</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["✕ Глютен", "✕ Молоко", "✕ Соя"].map(a => (
                      <span key={a} style={{ backgroundColor: "#B91C1C20", color: "#F87171", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 99, border: "1px solid #B91C1C40" }}>{a}</span>
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: 10, color: "#334155" }}>allerguide.app · #аллергия #питание</div>
              </div>
            </div>

            {/* Post variant 2 — awareness */}
            <div style={{ width: 320, height: 320, borderRadius: 16, overflow: "hidden", flexShrink: 0, position: "relative", backgroundColor: "#EFF4FF" }}>
              <div style={{ position: "relative", zIndex: 1, padding: 28, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <svg width="28" height="28" viewBox="0 0 44 44" fill="none">
                  <rect width="44" height="44" rx="10" fill="#2563EB"/>
                  <path d="M22 10L32 16V28L22 34L12 28V16L22 10Z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                  <path d="M17 22h10M22 17v10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                <div>
                  <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 30, fontWeight: 700, color: "#1E3A5F", lineHeight: 1.15, marginBottom: 12 }}>Состав за 1 секунду. Без догадок.</div>
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>Сканируйте штрихкод — AllerGuide мгновенно выделит опасные ингредиенты.</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>allerguide.app</div>
                  <div style={{ fontSize: 11, color: "#2563EB", fontWeight: 600, backgroundColor: "#DBEAFE", padding: "4px 10px", borderRadius: 99 }}>Скачать →</div>
                </div>
              </div>
            </div>

            {/* Post variant 3 — story */}
            <div style={{ width: 180, height: 320, borderRadius: 16, overflow: "hidden", flexShrink: 0, position: "relative", backgroundColor: "#2563EB" }}>
              <div style={{ position: "relative", zIndex: 1, padding: 20, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div className="flex items-center gap-2">
                  <svg width="22" height="22" viewBox="0 0 44 44" fill="none">
                    <rect width="44" height="44" rx="10" fill="rgba(255,255,255,0.2)"/>
                    <path d="M22 10L32 16V28L22 34L12 28V16L22 10Z" fill="none" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M17 22h10M22 17v10" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  <span style={{ fontSize: 13, color: "white", fontWeight: 600 }}>AllerGuide</span>
                </div>
                <div>
                  <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 20, fontWeight: 700, color: "white", lineHeight: 1.2, marginBottom: 8 }}>Безопасный выбор каждый день</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>Проверяйте состав прямо в магазине</div>
                </div>
                <div style={{ backgroundColor: "white", color: "#2563EB", fontSize: 12, fontWeight: 700, textAlign: "center", padding: "8px 0", borderRadius: 8 }}>Узнать больше</div>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 10 }}>Слева направо: результат сканирования (тёмный) · информационный пост · Stories (9:16)</div>
        </section>

        {/* App UI screens */}
        <section>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>Интерфейс приложения · Ключевые экраны</div>
          <div className="flex gap-5 overflow-x-auto pb-2">

            {/* Home screen */}
            <div style={{ width: 220, flexShrink: 0, backgroundColor: "#F4F6F9", borderRadius: 20, overflow: "hidden", border: "1px solid #E2E8F0", boxShadow: "0 4px 24px rgba(37,99,235,0.08)" }}>
              <div style={{ backgroundColor: "#1E3A5F", padding: "20px 16px 16px" }}>
                <div style={{ fontSize: 9, color: "#60A5FA", letterSpacing: "0.1em", marginBottom: 4 }}>ALLERGY MANAGEMENT</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 18, fontWeight: 700, color: "white" }}>AllerGuide</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>Привет, Мария 👋</div>
                  </div>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 14, color: "white", fontWeight: 700 }}>М</span>
                  </div>
                </div>
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ backgroundColor: "#2563EB", borderRadius: 10, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 18 }}>📷</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>Сканировать</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)" }}>Проверить состав</div>
                  </div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Ваши аллергены</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {allergens.map(a => (
                    <span key={a} style={{ backgroundColor: "#FEF2F2", color: "#B91C1C", fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 99 }}>{a}</span>
                  ))}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 8, marginBottom: 6 }}>Последние сканы</div>
                {["Activia йогурт", "Lay's оригинальный"].map(item => (
                  <div key={item} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #F4F6F9" }}>
                    <span style={{ fontSize: 10, color: "#1E3A5F" }}>{item}</span>
                    <span style={{ backgroundColor: "#F0FDF4", color: "#15803D", fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 99 }}>✓</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scan result — danger */}
            <div style={{ width: 220, flexShrink: 0, backgroundColor: "#F4F6F9", borderRadius: 20, overflow: "hidden", border: "1px solid #E2E8F0", boxShadow: "0 4px 24px rgba(185,28,28,0.08)" }}>
              <div style={{ backgroundColor: "#B91C1C", padding: "20px 16px 16px" }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em", marginBottom: 4 }}>РЕЗУЛЬТАТ СКАНИРОВАНИЯ</div>
                <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 16, fontWeight: 700, color: "white", lineHeight: 1.2 }}>Шок. батончик Alpen Gold</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>Штрихкод 4607041790543</div>
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ backgroundColor: "#FEF2F2", borderRadius: 8, padding: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#B91C1C", marginBottom: 6 }}>⚠ Обнаружены аллергены</div>
                  {allergens.slice(0, 3).map(a => (
                    <div key={a} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#B91C1C", flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "#1E3A5F" }}>{a}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Безопасные</div>
                {safeAllergens.map(a => (
                  <div key={a} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#15803D", flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: "#475569" }}>{a}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scan result — safe */}
            <div style={{ width: 220, flexShrink: 0, backgroundColor: "#F4F6F9", borderRadius: 20, overflow: "hidden", border: "1px solid #E2E8F0", boxShadow: "0 4px 24px rgba(21,128,61,0.08)" }}>
              <div style={{ backgroundColor: "#15803D", padding: "20px 16px 16px" }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em", marginBottom: 4 }}>РЕЗУЛЬТАТ СКАНИРОВАНИЯ</div>
                <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 16, fontWeight: 700, color: "white", lineHeight: 1.2 }}>Lay's Оригинальный</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>Штрихкод 5900259124908</div>
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ backgroundColor: "#F0FDF4", borderRadius: 8, padding: 10, marginBottom: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>✓</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#15803D" }}>Безопасен для вас</div>
                  <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>Ни один из ваших аллергенов не обнаружен</div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Состав включает</div>
                {["Картофель", "Подсолнечное масло", "Соль"].map(i => (
                  <div key={i} style={{ fontSize: 10, color: "#475569", padding: "2px 0", borderBottom: "1px solid #F4F6F9" }}>{i}</div>
                ))}
              </div>
            </div>

            {/* SOS Screen */}
            <div style={{ width: 220, flexShrink: 0, backgroundColor: "#0B1120", borderRadius: 20, overflow: "hidden", border: "1px solid #334155", boxShadow: "0 4px 24px rgba(0,0,0,0.2)" }}>
              <div style={{ padding: "20px 16px 12px" }}>
                <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em", marginBottom: 4 }}>SOS · ЭКСТРЕННАЯ КАРТА</div>
                <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 16, fontWeight: 700, color: "#E2E8F0", lineHeight: 1.2 }}>Мария Иванова</div>
              </div>
              <div style={{ padding: "0 12px 12px" }}>
                <div style={{ backgroundColor: "#B91C1C20", border: "1px solid #B91C1C40", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#F87171", marginBottom: 6 }}>АЛЛЕРГИИ</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                    {allergens.map(a => (
                      <span key={a} style={{ backgroundColor: "#7F1D1D", color: "#FCA5A5", fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 99 }}>{a}</span>
                    ))}
                  </div>
                </div>
                <div style={{ backgroundColor: "#151D2E", borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", marginBottom: 6 }}>ЭКСТРЕННЫЕ КОНТАКТЫ</div>
                  {["Мама: +7 999 000 00 01", "Муж: +7 999 000 00 02"].map(c => (
                    <div key={c} style={{ fontSize: 10, color: "#64748B", marginBottom: 3 }}>{c}</div>
                  ))}
                </div>
                <div style={{ backgroundColor: "#2563EB", borderRadius: 8, padding: 8, marginTop: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "white" }}>📞 Вызвать скорую</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social media banner */}
        <section>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>VK / Telegram banner · 1584 × 396</div>
          <div style={{ borderRadius: 12, overflow: "hidden", background: "linear-gradient(135deg, #1E3A5F 0%, #2563EB 60%, #3B82F6 100%)", padding: "28px 36px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: 28, fontWeight: 700, color: "white", lineHeight: 1.1 }}>AllerGuide</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 6 }}>Умное управление аллергией · Сканируй. Доверяй. Живи.</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ backgroundColor: "white", color: "#2563EB", fontSize: 13, fontWeight: 700, padding: "10px 20px", borderRadius: 8 }}>Скачать бесплатно</div>
              <div style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "white", fontSize: 13, fontWeight: 600, padding: "10px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)" }}>Узнать больше</div>
            </div>
          </div>
        </section>

        {/* Push notification */}
        <section>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>Push-уведомления и диалоги</div>
          <div className="grid grid-cols-3 gap-5">
            {[
              { icon: "⚠️", title: "Найден аллерген", body: "Шоколадный батончик содержит глютен и молоко — продукты из вашего списка.", color: "#FEF2F2", border: "#FECACA" },
              { icon: "✅", title: "Продукт безопасен", body: "Lay's Оригинальный не содержит ни одного из ваших аллергенов.", color: "#F0FDF4", border: "#BBF7D0" },
              { icon: "💾", title: "Резервная копия", body: "Ваши профили успешно сохранены в облако. Данные зашифрованы.", color: "#EFF4FF", border: "#BFDBFE" },
            ].map((n, i) => (
              <div key={i} style={{ backgroundColor: n.color, border: `1px solid ${n.border}`, borderRadius: 12, padding: 14, display: "flex", gap: 10 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{n.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1E3A5F", marginBottom: 3 }}>AllerGuide · {n.title}</div>
                  <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>{n.body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-[#E2E8F0] pt-6 flex justify-between items-center">
          <span style={{ fontSize: 11, color: "#94A3B8" }}>AllerGuide Brandbook 2025 · Board 3 of 4</span>
          <span style={{ fontSize: 11, color: "#2563EB", fontWeight: 600 }}>Бренд в действии</span>
        </footer>
      </div>
    </div>
  );
}
