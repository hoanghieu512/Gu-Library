// Thuật toán layout "kệ sách" cho Home (redesign Beat 1). Thuần, không DOM → test được.

// Bề dày gáy = số tài liệu, ánh xạ min→max có CLAMP:
//   0 tài liệu   → mỏng nhất (MIN) nhưng vẫn chạm/đọc được;
//   ≥ CAP tài liệu → dày tối đa (MAX) — TRẦN để môn rất nhiều (vd 44) không nuốt cả kệ.
// Tuyến tính giữa hai đầu → phân biệt rõ 0 vs 5 vs 44 (đo bằng data thật của Gú).
export const SPINE_MIN = 24;
export const SPINE_MAX = 68;
export const SPINE_CAP = 25; // số tài liệu chạm trần bề dày

export function spineWidth(docCount: number): number {
  const c = Math.min(Math.max(docCount, 0), SPINE_CAP);
  return Math.round(SPINE_MIN + (SPINE_MAX - SPINE_MIN) * (c / SPINE_CAP));
}

// Nhồi gáy theo bề rộng kệ: xếp trái→phải, hết chỗ tràn xuống tầng dưới.
// Trả về các TẦNG (mỗi tầng = mảng index gáy). Gáy rộng hơn cả kệ → đứng một mình (không kẹt).
export function packShelves(widths: number[], containerWidth: number, gap: number): number[][] {
  const rows: number[][] = [];
  let cur: number[] = [];
  let curW = 0;
  for (let i = 0; i < widths.length; i++) {
    const w = widths[i];
    const needed = cur.length === 0 ? w : curW + gap + w;
    if (cur.length > 0 && needed > containerWidth) {
      rows.push(cur);
      cur = [i];
      curW = w;
    } else {
      cur.push(i);
      curW = needed;
    }
  }
  if (cur.length > 0) rows.push(cur);
  return rows;
}
