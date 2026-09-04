import {
  pressLayout, PRESS_W, PRESS_H, BEAM_BOTTOM, ROD_LEFT, ROD_W,
  HEAD_LEFT, HEAD_W, HEAD_H, BASE_TOP,
  PLATE_VIEW_W, PLATE_VIEW_H, PLATE_X, PLATE_Y, PLATE_RECT_W, PLATE_RECT_H,
  PLATE_FONT_NAME, PLATE_FONT_COUNT, NAME_BASELINE, COUNT_BASELINE,
} from '../home/press';
import frameUrl from '../assets/press-frame.png?no-inline';
import rodUrl from '../assets/press-rod.png?no-inline';
import headUrl from '../assets/press-head.png?no-inline';

// "Chưa phân loại" = MÁY ÉP SÁCH (book press) ở cuối kệ. Xấp giấy giữa hai bàn ép = tài liệu CHƯA
// đóng gáy. Chạm → mở "Chưa phân loại".
//
// Beat này đổi SVG tự vẽ → 3 sprite cắt từ MỘT tấm ảnh (scripts/make-press-sprites.py):
//   frame  xà + tay vặn + trụ + đế   (tĩnh, vẽ SAU CÙNG nên hai trụ che đúng hai đầu bàn ép)
//   rod    một đoạn ren trơn         (LẶP dọc → bước ren không đổi dù trục dài ngắn thế nào)
//   head   mâm đồng + bàn ép         (khổ cố định, chỉ đổi y)
// KHÔNG gen 3 ảnh cho 3 trạng thái: model sinh ảnh không giữ được bộ — cùng prompt đổi một câu là
// ra một cỗ máy khác. Gen MỘT rồi dựng trạng thái bằng code, nhờ vậy được trạng thái LIÊN TỤC theo
// số tài liệu thay vì 3 nấc 0 / 1–4 / ≥5 như bản SVG cũ.
//
// Khổ + toạ độ + phép ánh xạ số-tài-liệu → bề dày giấy nằm ở src/home/press.ts (thuần, có test).
// Bảng đồng TRONG ẢNH chỉ rộng ~19px lúc render → không nhét chữ vào được, nên bảng chữ vẫn do code
// vẽ đè lên đế, GIỮ NGUYÊN chữ + bố cục bản SVG cũ: "Chưa phân loại" (khớp tên dùng ở Import /
// "Chuyển tới…") trên, số tài liệu dưới, cả hai chữ tối trên nền đồng.
// KHÔNG dùng chữ "CHƯA ĐÓNG GÁY" của bản vẽ AI: đây là beat áp da, đổi chữ là đổi hành vi.

// MonShelf nhồi kệ bằng PRESS_W — re-export để chỗ dùng không phải biết tới press.ts.
export { PRESS_W };

const BASE_H = PRESS_H - BASE_TOP;   // bề cao thân đế — chỗ đặt bảng đồng
const PLATE_INK = '#33270a';

export default function BookPress({ count, onOpen, uri }: { count: number; onOpen: (uri: string) => void; uri: string }) {
  const { paperH, headTop, rodH, sheets } = pressLayout(count);

  return (
    <div
      onClick={() => onOpen(uri)}
      role="button"
      aria-label={`Mở Chưa phân loại (${count} tài liệu)`}
      style={{
        width: PRESS_W, height: PRESS_H, flex: '0 0 auto', cursor: 'pointer',
        alignSelf: 'flex-end', position: 'relative',
      }}
    >
      {/* Trục vít: lặp dọc nên bước ren giữ nguyên ở mọi độ dài */}
      <div style={{
        position: 'absolute', left: ROD_LEFT, top: BEAM_BOTTOM, width: ROD_W, height: Math.max(rodH, 0),
        backgroundImage: `url(${rodUrl})`, backgroundRepeat: 'repeat-y',
        backgroundSize: `${ROD_W}px auto`,
      }} />

      {/* Xấp giấy — đứng trên đế, đội bàn ép lên */}
      {paperH > 0 && (
        <div style={{
          position: 'absolute', left: HEAD_LEFT + HEAD_W * 0.09, width: HEAD_W * 0.82,
          top: BASE_TOP - paperH, height: paperH,
          background: 'linear-gradient(180deg, #f6eed2, #d9c9a0)',
          borderRadius: 1, boxShadow: '0 1px 2px rgba(0,0,0,.35)',
        }}>
          {Array.from({ length: sheets }, (_, i) => (
            <div key={i} style={{
              position: 'absolute', left: 0, right: 0, top: ((i + 1) * paperH) / (sheets + 1),
              height: 1, background: 'rgba(150,132,90,.55)',
            }} />
          ))}
        </div>
      )}

      {/* Mâm đồng + bàn ép */}
      <img src={headUrl} alt="" aria-hidden style={{
        position: 'absolute', left: HEAD_LEFT, top: headTop, width: HEAD_W, height: HEAD_H,
      }} />

      {/* Khung máy — vẽ sau cùng để hai trụ nằm TRƯỚC bàn ép */}
      <img src={frameUrl} alt="" aria-hidden style={{
        position: 'absolute', inset: 0, width: PRESS_W, height: PRESS_H,
      }} />

      {/* Bảng đồng: tên + số tài liệu — y như bản SVG cũ, chỉ đổi nền vẽ.
          PHẢI là SVG có viewBox, KHÔNG phải div: WebView kẹp cỡ chữ tối thiểu ~8px nên chữ nhỏ
          đặt bằng CSS bị nâng lên và tràn khỏi bảng (đo được trên máy: đặt 4.4px, ra nét cao 7–8px).
          Trong viewBox thì cỡ chữ tính bằng user unit (18/20 — trên ngưỡng kẹp) rồi cả khung mới
          thu nhỏ theo PRESS_W, nên ra đúng cỡ mong muốn. */}
      <svg
        viewBox={`0 0 ${PLATE_VIEW_W} ${PLATE_VIEW_H}`} width={PRESS_W} height={BASE_H} aria-hidden
        style={{ position: 'absolute', left: 0, top: BASE_TOP, display: 'block' }}
      >
        <defs>
          <linearGradient id="gu-press-brass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f0d182" />
            <stop offset=".45" stopColor="#c79a34" />
            <stop offset="1" stopColor="#8a6a1e" />
          </linearGradient>
        </defs>
        <rect
          x={PLATE_X} y={PLATE_Y} width={PLATE_RECT_W} height={PLATE_RECT_H} rx={PLATE_RECT_H * 0.12}
          fill="url(#gu-press-brass)" stroke="#5f4913" strokeWidth={PLATE_VIEW_H * 0.02}
        />
        <text
          x={PLATE_VIEW_W / 2} y={NAME_BASELINE} textAnchor="middle" fill={PLATE_INK}
          fontFamily="var(--gu-serif)" fontWeight="700" fontSize={PLATE_FONT_NAME}
        >Chưa phân loại</text>
        <text
          x={PLATE_VIEW_W / 2} y={COUNT_BASELINE} textAnchor="middle" fill={PLATE_INK}
          fontFamily="var(--gu-serif)" fontWeight="700" fontSize={PLATE_FONT_COUNT}
        >{count} tài liệu</text>
      </svg>
    </div>
  );
}
