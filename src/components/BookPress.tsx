// "Chưa phân loại" = MÁY ÉP SÁCH (book press) ở cuối kệ (Home tủ-sách Beat 3a, theo bản thảo Gú).
// Xấp giấy giữa hai bàn ép = tài liệu CHƯA đóng gáy. 3 trạng thái theo số file:
//   0 → không giấy · 1–4 → ít giấy (xấp mỏng) · ≥5 → nhiều giấy (xấp dày).
// Chạm → mở "Chưa phân loại". SVG thuần → nhẹ. Đế SÁT đáy kệ (không hở), gỗ có mặt-trên bắt sáng.

// Nội dung vẽ trong hệ toạ độ 92×150; hiển thị THU 10% (PRESS_W/H_OUT) → bớt lấn tầng 2 trên máy dọc
// (Beat 3b tinh chỉnh). viewBox giữ nguyên nên SVG tự co đều mọi chi tiết.
const W = 92;
const H = 150;
// Bề rộng THẬT khi render — export để MonShelf nhồi kệ (packShelves) đúng bằng chỗ press chiếm.
// Trước đây kệ nhồi press theo `spineWidth(số tài liệu)` (~31px) trong khi render 83px → TRÀN kệ.
export const PRESS_W = 83;  // ~92 × 0.9
const H_OUT = 135;          // ~150 × 0.9
const FLOOR = 148; // đáy đế sát sàn kệ → không hở khoảng trống

export default function BookPress({ count, onOpen, uri }: { count: number; onOpen: (uri: string) => void; uri: string }) {
  const paperH = count === 0 ? 0 : count < 5 ? 12 : 26; // ít / nhiều
  const baseTop = 122;            // mặt trên của đế (giấy đứng trên đây)
  const platenY = baseTop - paperH - 6;
  const pages = paperH > 0 ? Math.min(Math.round(paperH / 3), 7) : 0;

  return (
    <div
      onClick={() => onOpen(uri)}
      role="button"
      aria-label={`Mở Chưa phân loại (${count} tài liệu)`}
      style={{ width: PRESS_W, height: H_OUT, flex: '0 0 auto', cursor: 'pointer', alignSelf: 'flex-end' }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width={PRESS_W} height={H_OUT} aria-hidden>
        <defs>
          <linearGradient id="bp-wood" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2b1d11" /><stop offset=".2" stopColor="#5a3d22" />
            <stop offset=".5" stopColor="#6e4a28" /><stop offset=".82" stopColor="#3d2a17" /><stop offset="1" stopColor="#20150d" />
          </linearGradient>
          <linearGradient id="bp-beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#835a33" /><stop offset=".5" stopColor="#5b3d22" /><stop offset="1" stopColor="#341f11" />
          </linearGradient>
          <linearGradient id="bp-brass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f0d182" /><stop offset=".45" stopColor="#c79a34" /><stop offset="1" stopColor="#7c5f18" />
          </linearGradient>
          <linearGradient id="bp-paper" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f6eed2" /><stop offset="1" stopColor="#d6c69c" />
          </linearGradient>
        </defs>

        {/* Trụ đứng 2 bên (xuống tới mặt đế) */}
        <rect x="10" y="40" width="10" height={baseTop - 40} fill="url(#bp-wood)" stroke="#1c1109" strokeWidth=".5" />
        <rect x="72" y="40" width="10" height={baseTop - 40} fill="url(#bp-wood)" stroke="#1c1109" strokeWidth=".5" />

        {/* Xà trên */}
        <rect x="4" y="27" width="84" height="14" rx="3" fill="url(#bp-beam)" stroke="#1c1109" strokeWidth=".6" />
        <rect x="4" y="27" width="84" height="3" rx="2" fill="#9a6c3e" opacity=".5" />

        {/* Trục vít brass + ren + tay vặn chữ T */}
        <rect x="43" y="40" width="6" height={platenY - 40} fill="url(#bp-brass)" />
        {Array.from({ length: Math.max(0, Math.floor((platenY - 44) / 4)) }, (_, i) => (
          <line key={i} x1="43" y1={45 + i * 4} x2="49" y2={47 + i * 4} stroke="#7c5f18" strokeWidth=".7" />
        ))}
        <rect x="27" y="13" width="38" height="7" rx="3.5" fill="url(#bp-brass)" />
        <circle cx="27" cy="16.5" r="4.6" fill="url(#bp-brass)" />
        <circle cx="65" cy="16.5" r="4.6" fill="url(#bp-brass)" />
        <rect x="44" y="17" width="4" height="6" fill="#7c5f18" />

        {/* Bàn ép trên (hạ theo xấp giấy) */}
        <rect x="17" y={platenY} width="58" height="6" rx="1.5" fill="url(#bp-beam)" stroke="#1c1109" strokeWidth=".5" />

        {/* Xấp giấy */}
        {paperH > 0 && (
          <g>
            <rect x="20" y={baseTop - paperH} width="52" height={paperH} rx="1" fill="url(#bp-paper)" stroke="#b3a373" strokeWidth=".4" />
            {Array.from({ length: pages }, (_, i) => (
              <line key={i} x1="20" y1={baseTop - paperH + (i + 1) * (paperH / (pages + 1))}
                x2="72" y2={baseTop - paperH + (i + 1) * (paperH / (pages + 1))} stroke="#c7b788" strokeWidth=".5" />
            ))}
          </g>
        )}

        {/* Đế: mặt trên bắt sáng + thân trước tối, sát đáy kệ */}
        <rect x="2" y={baseTop} width="88" height="3.5" fill="#8a5f36" />
        <rect x="2" y={baseTop + 3.5} width="88" height={FLOOR - baseTop - 3.5} rx="3" fill="url(#bp-wood)" stroke="#1c1109" strokeWidth=".6" />

        {/* Bảng đồng "Chưa phân loại" + số (trên thân đế) — khớp tên dùng ở Import / "Chuyển tới…" */}
        <rect x="16" y={baseTop + 8} width="60" height="14" rx="2" fill="url(#bp-brass)" stroke="#5f4913" strokeWidth=".5" />
        <text x="46" y={baseTop + 14} textAnchor="middle" fontSize="5" fontWeight="700" fill="#33270a" letterSpacing=".2">Chưa phân loại</text>
        <text x="46" y={baseTop + 19.5} textAnchor="middle" fontSize="5.4" fontWeight="700" fill="#33270a">{count} tài liệu</text>
      </svg>
    </div>
  );
}
