import {
  pressLayout, PRESS_W, PRESS_H, BEAM_BOTTOM, ROD_LEFT, ROD_W,
  HEAD_LEFT, HEAD_W, HEAD_H, BASE_TOP,
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
const PLATE_W = PRESS_W * 0.80;
const PLATE_H = BASE_H * 0.62;
// KHÔNG cắt (overflow) bảng: dấu tiếng Việt nhô cao hơn thân chữ, xén là mất dấu —
// đã thấy thật trên máy ("ĐÓNG GÁY" ra "ĐONG GAY"). Chặn tràn bằng cỡ chữ, không bằng kéo.
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

      {/* Bảng đồng: tên + số tài liệu — y như bản SVG cũ, chỉ đổi nền vẽ */}
      <div style={{
        position: 'absolute', left: (PRESS_W - PLATE_W) / 2, width: PLATE_W,
        top: BASE_TOP + BASE_H * 0.14, height: PLATE_H, borderRadius: 1.5,
        background: 'linear-gradient(180deg, #f0d182, #c79a34 45%, #8a6a1e)',
        border: '.5px solid #5f4913', boxShadow: '0 1px 1px rgba(0,0,0,.4)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--gu-serif)', fontWeight: 700, color: PLATE_INK, whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: PLATE_H * 0.34, lineHeight: 1.18 }}>Chưa phân loại</span>
        <span style={{ fontSize: PLATE_H * 0.37, lineHeight: 1.18 }}>{count} tài liệu</span>
      </div>
    </div>
  );
}
