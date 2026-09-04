// Chuẩn hoá + cắt từ cho tìm kiếm. Thuần, không DOM → test được.
//
// Yêu cầu cốt lõi (spec §7): gõ KHÔNG DẤU vẫn ra kết quả CÓ DẤU — "to tung hinh su" phải khớp
// "Tố tụng Hình sự". Đây là chỗ app hơn hẳn tìm-kiếm-file thông thường với tiếng Việt.

// Bỏ dấu: NFD tách dấu thành ký tự tổ hợp (U+0300–U+036F) rồi xoá.
// BẪY: đ/Đ KHÔNG phải chữ có dấu tổ hợp mà là ký tự RIÊNG (U+0111/U+0110) → NFD không đụng tới,
// phải thay tay. Thiếu bước này thì "dat dai" không khớp "Đất đai".
export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd');
}

// Cắt từ: giữ chữ và SỐ, bỏ mọi thứ khác.
// Giữ số vì tra cứu luật sống bằng số — "Điều 5", "khoản 2", "23/2015/NĐ-CP" (thành 23 · 2015 ·
// nd · cp). Không đặt sàn độ dài: token "5" là token quan trọng nhất của "Điều 5".
export function tokenize(s: string): string[] {
  const out: string[] = [];
  let cur = '';
  for (const ch of fold(s)) {
    if ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9')) cur += ch;
    else if (cur) { out.push(cur); cur = ''; }
  }
  if (cur) out.push(cur);
  return out;
}

export interface WordSpan { start: number; end: number; folded: string }

/**
 * Cắt từ NHƯNG giữ vị trí trong chuỗi GỐC — để tô sáng đúng chỗ trong đoạn trích.
 *
 * Vì sao không bỏ dấu cả chuỗi rồi tìm vị trí trên chuỗi đã bỏ dấu: `fold` đi qua NFD nên ĐỘ DÀI
 * thay đổi (chữ có dấu tách thành chữ + dấu rồi mới bỏ dấu) → vị trí lệch. Cắt theo từ rồi bỏ dấu
 * TỪNG TỪ thì mỗi từ giữ nguyên mốc đầu/cuối của nó trong chuỗi gốc.
 *
 * Chỉ dùng cho vài chục đơn vị đang hiện kết quả — KHÔNG dùng lúc dựng index (ở đó `tokenize`
 * chạy một lượt trên cả triệu ký tự, gọi normalize từng từ sẽ quá chậm).
 */
export function wordSpans(text: string): WordSpan[] {
  const out: WordSpan[] = [];
  let start = -1;
  for (let i = 0; i <= text.length; i++) {
    const ch = i < text.length ? fold(text[i]) : '';
    const isWord = (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9');
    if (isWord && start < 0) start = i;
    else if (!isWord && start >= 0) {
      out.push({ start, end: i, folded: fold(text.slice(start, i)) });
      start = -1;
    }
  }
  return out;
}
