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
 * @param exact   token phải khớp nguyên
 * @param prefix  token cuối của truy vấn — khớp theo tiền tố (người dùng đang gõ dở)
 */
export function makeSnippet(
  text: string,
  exact: string[],
  prefix: string | null,
  radius = 90,
): Snippet {
  const spans = wordSpans(text);
  const hit = (f: string) => exact.includes(f) || (prefix != null && prefix !== '' && f.startsWith(prefix));

  // Neo vào token ĐÃ GÕ XONG trước, chỉ khi không có mới neo vào token đang gõ dở: chữ cuối
  // thường là chữ phổ biến ("ch", "ng") nên khớp sớm ở chỗ chẳng liên quan, kéo cửa sổ đi xa
  // chỗ người ta thực sự muốn thấy.
  let first = exact.length ? spans.findIndex((s) => exact.includes(s.folded)) : -1;
  if (first < 0) first = spans.findIndex((s) => hit(s.folded));
  if (first < 0) {
    // Không định vị được (vd khớp nhờ token khác dạng) → lấy đầu đơn vị, vẫn hợp lệ.
    const cut = text.slice(0, radius * 2);
    return { text: cut, marks: [], cutHead: false, cutTail: cut.length < text.length };
  }

  const anchor = spans[first];
  // Căn cửa sổ quanh chỗ khớp ĐẦU TIÊN, rồi bám ra biên TỪ để không cắt ngang chữ.
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

  const marks = spans
    .filter((s) => s.start >= from && s.end <= to && hit(s.folded))
    .map((s) => ({ start: s.start - from, end: s.end - from }));

  return { text: text.slice(from, to), marks, cutHead: from > 0, cutTail: to < text.length };
}
