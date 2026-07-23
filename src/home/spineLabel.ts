// Nhãn HIỂN THỊ trên gáy sách Home (redesign). Thuần format hiển thị — KHÔNG đụng tên folder thật,
// KHÔNG lan sang header FolderPage/breadcrumb. Bỏ tiền tố "Luật " cho gọn gáy ("Luật Đất Đai" →
// "Đất Đai"). Chỉ bỏ khi CÒN phần sau (môn tên đúng "Luật" giữ nguyên). Giữ nguyên hoa/thường gốc.
export function spineLabel(monName: string): string {
  const m = /^Luật\s+(.+)$/.exec(monName);
  return m ? m[1] : monName;
}
