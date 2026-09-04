// Máy ép sách "Chưa phân loại": khổ, toạ độ sprite, và trạng thái theo số tài liệu.
// Thuần, không DOM → test được, cùng lối với shelf.ts. BookPress.tsx chỉ còn việc vẽ.

// Toạ độ gốc nằm trong hệ 342×405 px mà scripts/make-press-sprites.py in ra.
// Đổi khổ hiển thị thì SỬA MỘT CHỖ: PRESS_H. Mọi số dưới tự theo.
const SPRITE_W = 342;
const SPRITE_H = 405;
const S = {
  beamBottom: 115,  // mặt dưới xà — đầu trên trục vít
  rodLeft: 158, rodW: 25,
  headLeft: 47, headW: 247, headH: 63,
  headTopRest: 149, // vị trí bàn ép trong ẢNH GỐC — mốc trên của khoảng chạy
  baseTop: 319,     // mặt trên đế — chỗ xấp giấy đứng
};

// Khổ render. PRESS_H là hằng số DUY NHẤT cần chỉnh nếu muốn máy ép to/nhỏ hơn.
// 98 chọn để bề rộng ra ĐÚNG 83 — bằng khổ SVG cũ, nên cách kệ nhồi hàng KHÔNG đổi.
// Đo trên máy: kho QA có tầng còn trống ~90px; thử 122 rồi 88 đều bị đẩy xuống một tầng
// gần như trống, 83 thì vào đúng chỗ cũ. Muốn máy ép to hơn thì sửa ĐÚNG số này, nhưng
// phải xem lại kệ vì nó ăn thẳng vào packShelves.
export const PRESS_H = 98;
const K = PRESS_H / SPRITE_H;

// Bề rộng THẬT khi render — MonShelf nhồi kệ bằng đúng số này.
// Bài học v1.28.2: nhồi bằng số khác bề rộng render thì tràn khung tủ.
export const PRESS_W = Math.round(SPRITE_W * K);

export const BEAM_BOTTOM = S.beamBottom * K;
export const ROD_LEFT = S.rodLeft * K;
export const ROD_W = S.rodW * K;
export const HEAD_LEFT = S.headLeft * K;
export const HEAD_W = S.headW * K;
export const HEAD_H = S.headH * K;
export const BASE_TOP = S.baseTop * K;

// Khoảng bàn ép chạy được: từ sát mặt đế lên tới đúng chỗ nó đứng trong ảnh gốc.
const TRAVEL = (S.baseTop - S.headTopRest - S.headH) * K;

// Bề dày xấp giấy: tuyến tính có TRẦN, đúng lối spineWidth().
//   0 tài liệu     → không giấy, bàn ép hạ sát đế;
//   ≥ CAP tài liệu → xấp dày tối đa.
// Trần lấy 90% khoảng chạy để trục vít không bao giờ co về 0 (ảnh ren cần chỗ để lặp).
export const PAPER_MAX = TRAVEL * 0.9;
export const PAPER_CAP = 8;

export function paperHeight(count: number): number {
  return (PAPER_MAX * Math.min(Math.max(count, 0), PAPER_CAP)) / PAPER_CAP;
}

// ---- Bảng đồng: vẽ bằng SVG, KHÔNG bằng div ----------------------------------------------
// WebView KẸP cỡ chữ tối thiểu ~8px: chữ CSS nhỏ hơn bị nâng lên 8px, div không hay biết →
// đo trên máy: đặt 4.39px mà nét chữ cao 7–8px, chữ tràn khỏi bảng. Bản SVG cũ né được là nhờ
// viewBox: cỡ chữ tính bằng USER UNIT (giữ trên 8 nên không bị kẹp) rồi cả khung mới thu nhỏ lại.
// => Mọi chữ nhỏ hơn 8px trong app phải đi đường SVG-có-viewBox. Giữ PLATE_FONT_* trên ngưỡng này.
export const PLATE_VIEW_W = SPRITE_W;                 // user unit = px sprite → tỉ lệ 1:1 với ảnh
export const PLATE_VIEW_H = SPRITE_H - S.baseTop;     // phần thân đế
export const PLATE_X = PLATE_VIEW_W * 0.16;
export const PLATE_RECT_W = PLATE_VIEW_W * 0.68;
export const PLATE_Y = PLATE_VIEW_H * 0.12;
export const PLATE_RECT_H = PLATE_VIEW_H * 0.62;
// Cỡ chữ đặt THẲNG bằng user unit, không suy từ bề cao bảng: đây là con số phải nằm trên
// ngưỡng kẹp của WebView, nên nó cần đứng độc lập và nhìn thấy được.
// 20 user unit × (PRESS_W / PLATE_VIEW_W ≈ 0,243) ≈ 4,9 CSS px — đúng cỡ bản SVG cũ vẫn dùng.
// Đặt cùng cỡ đó bằng CSS thì WebView nâng lên 8px rồi chữ tràn khỏi bảng (đo được trên máy).
export const PLATE_FONT_NAME = 20;    // "Chưa phân loại"
export const PLATE_FONT_COUNT = 21;   // "N tài liệu"

// Hai đường cơ chữ (user unit). Tính ở đây chứ không ở component để test chặn được ca chữ
// CAO HƠN BẢNG — đã sai thật một lần: khối chữ 56 unit nhét vào bảng 50 unit, phép căn giữa ra
// số ÂM nên nét trên chọc lên khỏi mép bảng.
const LEADING = 1.15;
export const NAME_BASELINE = PLATE_Y
  + (PLATE_RECT_H - (PLATE_FONT_NAME + PLATE_FONT_COUNT) * LEADING) / 2
  + PLATE_FONT_NAME * 0.80;
export const COUNT_BASELINE = NAME_BASELINE + PLATE_FONT_NAME * 0.35 + PLATE_FONT_COUNT * 0.80;
// Mép trên nét chữ dòng 1 và mép dưới nét chữ dòng 2 (kể cả dấu và đuôi chữ).
export const INK_TOP = NAME_BASELINE - PLATE_FONT_NAME * 0.78;
export const INK_BOTTOM = COUNT_BASELINE + PLATE_FONT_COUNT * 0.26;

export interface PressLayout {
  paperH: number;   // bề dày xấp giấy
  headTop: number;  // đỉnh mâm+bàn ép — bàn ép ĐỘI trên xấp giấy
  rodH: number;     // chiều dài trục vít lộ ra, luôn > 0
  sheets: number;   // số vạch tờ vẽ trong xấp (0 khi không có giấy)
}

export function pressLayout(count: number): PressLayout {
  const paperH = paperHeight(count);
  const headTop = BASE_TOP - paperH - HEAD_H;
  return {
    paperH,
    headTop,
    rodH: headTop - BEAM_BOTTOM,
    sheets: paperH > 0 ? Math.min(Math.round(paperH / (PAPER_MAX / 7)), 8) : 0,
  };
}
