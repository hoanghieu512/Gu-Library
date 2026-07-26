// Nhãn HIỂN THỊ trên gáy sách Home (redesign). Thuần format hiển thị — KHÔNG đụng tên folder thật,
// KHÔNG lan sang header FolderPage/breadcrumb. Bỏ tiền tố "Luật " cho gọn gáy ("Luật Đất Đai" →
// "Đất Đai"). Chỉ bỏ khi CÒN phần sau (môn tên đúng "Luật" giữ nguyên). Beat 3b: sau khi cắt tiền
// tố → VIẾT HOA chữ đầu ("Luật hành chính" → "Hành chính") cho khớp mắt các gáy đã hoa; tên KHÔNG có
// tiền tố giữ NGUYÊN (Gú đã tự canh hoa/thường). toUpperCase xử đúng dấu tiếng Việt (đ→Đ, ô→Ô).
export function spineLabel(monName: string): string {
  const m = /^Luật\s+(.+)$/.exec(monName);
  if (!m) return monName;
  const rest = m[1];
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}
