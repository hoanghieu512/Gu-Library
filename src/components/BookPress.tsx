// "Chưa phân loại" = MÁY ÉP SÁCH (book press) ở cuối kệ (Home tủ-sách Beat 3a, theo bản thảo Gú).
// Xấp giấy giữa hai bàn ép = tài liệu CHƯA đóng gáy (chưa phân loại). 3 trạng thái theo số file:
//   0 → không giấy (bàn ép sát) · 1–4 → ít giấy (xấp mỏng) · ≥5 → nhiều giấy (xấp dày).
// Chạm → mở "Chưa phân loại" (điều hướng GIỮ NGUYÊN). SVG thuần (không ảnh) → nhẹ, tint gỗ/đồng.

const W = 92;
const H = 150;

export default function BookPress({ count, onOpen, uri }: { count: number; onOpen: (uri: string) => void; uri: string }) {
  const paperH = count === 0 ? 0 : count < 5 ? 13 : 27; // ít / nhiều
  const baseTop = 118;
  const platenY = baseTop - paperH - 6;
  const pages = paperH > 0 ? Math.min(Math.round(paperH / 3), 8) : 0;

  return (
    <div
      onClick={() => onOpen(uri)}
      role="button"
      aria-label={`Mở Chưa phân loại (${count} tài liệu chưa đóng gáy)`}
      style={{ width: W, height: H, flex: '0 0 auto', cursor: 'pointer', alignSelf: 'flex-end' }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden>
        <defs>
          <linearGradient id="bp-wood" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2f2013" /><stop offset=".18" stopColor="#5a3d22" />
            <stop offset=".5" stopColor="#6e4a28" /><stop offset=".85" stopColor="#402c18" /><stop offset="1" stopColor="#241810" />
          </linearGradient>
          <linearGradient id="bp-wood-h" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7a5430" /><stop offset="1" stopColor="#3a2717" />
          </linearGradient>
          <linearGradient id="bp-brass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#e8c66a" /><stop offset=".5" stopColor="#b8912e" /><stop offset="1" stopColor="#8a6a1e" />
          </linearGradient>
          <linearGradient id="bp-paper" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f3e9cf" /><stop offset="1" stopColor="#d9c9a0" />
          </linearGradient>
        </defs>

        {/* Trụ đứng 2 bên */}
        <rect x="9" y="34" width="11" height="86" rx="2" fill="url(#bp-wood)" />
        <rect x="72" y="34" width="11" height="86" rx="2" fill="url(#bp-wood)" />

        {/* Xà trên */}
        <rect x="4" y="24" width="84" height="13" rx="3" fill="url(#bp-wood-h)" stroke="#241810" strokeWidth=".6" />

        {/* Trục vít + tay vặn chữ T */}
        <rect x="42" y="37" width="8" height={platenY - 37} fill="url(#bp-brass)" />
        {Array.from({ length: Math.max(0, Math.floor((platenY - 40) / 5)) }, (_, i) => (
          <line key={i} x1="42" y1={42 + i * 5} x2="50" y2={44 + i * 5} stroke="#8a6a1e" strokeWidth=".8" />
        ))}
        <rect x="28" y="12" width="36" height="7" rx="3.5" fill="url(#bp-brass)" />
        <circle cx="28" cy="15.5" r="5" fill="url(#bp-brass)" />
        <circle cx="64" cy="15.5" r="5" fill="url(#bp-brass)" />
        <rect x="44" y="17" width="4" height="8" fill="#8a6a1e" />

        {/* Bàn ép trên (di chuyển theo xấp giấy) */}
        <rect x="18" y={platenY} width="56" height="6" rx="1.5" fill="url(#bp-wood-h)" stroke="#241810" strokeWidth=".5" />

        {/* Xấp giấy */}
        {paperH > 0 && (
          <g>
            <rect x="21" y={baseTop - paperH} width="50" height={paperH} rx="1" fill="url(#bp-paper)" stroke="#b8a878" strokeWidth=".4" />
            {Array.from({ length: pages }, (_, i) => (
              <line key={i} x1="21" y1={baseTop - paperH + (i + 1) * (paperH / (pages + 1))}
                x2="71" y2={baseTop - paperH + (i + 1) * (paperH / (pages + 1))} stroke="#c9b98a" strokeWidth=".5" />
            ))}
          </g>
        )}

        {/* Đế + mặt trên có ánh sáng */}
        <rect x="2" y={baseTop} width="88" height="22" rx="3" fill="url(#bp-wood)" stroke="#241810" strokeWidth=".6" />
        <rect x="2" y={baseTop} width="88" height="3" fill="#7a5430" opacity=".55" />

        {/* Bảng đồng CHƯA ĐÓNG GÁY + số */}
        <rect x="18" y={baseTop + 5} width="56" height="13" rx="2" fill="url(#bp-brass)" stroke="#6e5518" strokeWidth=".5" />
        <text x="46" y={baseTop + 11} textAnchor="middle" fontSize="4.6" fontWeight="700" fill="#3a2c08" letterSpacing=".2">CHƯA ĐÓNG GÁY</text>
        <text x="46" y={baseTop + 16.5} textAnchor="middle" fontSize="5.4" fontWeight="700" fill="#3a2c08">{count} tài liệu</text>
      </svg>
    </div>
  );
}
