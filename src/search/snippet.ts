// Đoạn trích quanh chỗ khớp, kèm vị trí để tô sáng. Thuần, không DOM → test được.
//
// Spec §7: kết quả là ĐOẠN TRÍCH kèm vị trí, không phải tên file. Nên phải cắt đúng quanh chỗ khớp
// và chỉ ra được chỗ nào khớp, chứ không cắt bừa 100 ký tự đầu đơn vị.

import { wordSpans } from './tokenize';

export interface Snippet {
  text: string;                              // đoạn đã cắt (từ chuỗi GỐC, còn nguyên dấu)
  marks: { start: number; end: number }[];   // vị trí tô sáng, tính TRONG `text`
  cutHead: boolean;                          // có cắt đầu không (để hiện "…")
  cutTail: boolean;
}

/**
 * Tìm mọi chỗ CỤM truy vấn xuất hiện liền nhau; trả chỉ số span bắt đầu của từng chỗ.
 * Token cuối khớp theo TIỀN TỐ (người dùng đang gõ dở).
 */
function runStarts(folded: string[], seq: string[]): number[] {
  const out: number[] = [];
  if (seq.length === 0) return out;
  const last = seq.length - 1;
  outer:
  for (let i = 0; i + last < folded.length; i++) {
    for (let k = 0; k < last; k++) if (folded[i + k] !== seq[k]) continue outer;
    if (!folded[i + last].startsWith(seq[last])) continue;
    out.push(i);
  }
  return out;
}

/**
 * @param seq token của truy vấn theo ĐÚNG THỨ TỰ (token cuối là tiền tố).
 *
 * Tô sáng theo CỤM chứ không rải rác từng token: tra "là công dân" mà đi tô "đánh" ở giữa câu
 * (vì bỏ dấu thì "đánh" → "danh", bắt đầu bằng "dan") thì nhìn như máy tìm bậy. Gú gặp thật.
 */
export function makeSnippet(text: string, seq: string[], radius = 90): Snippet {
  const spans = wordSpans(text);
  const folded = spans.map((s) => s.folded);
  const starts = runStarts(folded, seq);

  if (starts.length === 0) {
    // Không định vị được (vd đoạn lọt vào nhờ bước lọc thô) → lấy đầu đơn vị, vẫn hợp lệ.
    const cut = text.slice(0, radius * 2);
    return { text: cut, marks: [], cutHead: false, cutTail: cut.length < text.length };
  }

  const anchor = spans[starts[0]];
  // Căn cửa sổ quanh cụm ĐẦU TIÊN, rồi bám ra biên TỪ để không cắt ngang chữ.
  let from = Math.max(0, anchor.start - radius);
  let to = Math.min(text.length, anchor.start + radius);
  if (from > 0) {
    const s = spans.find((x) => x.start >= from);
    if (s) from = s.start;
  }
  if (to < text.length) {
    const s = [...spans].reverse().find((x) => x.end <= to);
    if (s) to = s.end;
  }

  // Mọi CỤM nằm gọn trong cửa sổ đều được tô — mỗi cụm là một vệt liền từ đầu tới cuối cụm.
  const marks: { start: number; end: number }[] = [];
  for (const i of starts) {
    const a = spans[i];
    const b = spans[i + seq.length - 1];
    if (a.start >= from && b.end <= to) marks.push({ start: a.start - from, end: b.end - from });
  }

  return { text: text.slice(from, to), marks, cutHead: from > 0, cutTail: to < text.length };
}
